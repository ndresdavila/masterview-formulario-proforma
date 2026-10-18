import { useCallback, useEffect, useRef, useState } from 'react';
import PizZip from 'pizzip';
import { buildLocalProforma } from '../utils/localWord';
import './StatusOverlay.css';
import './WordPreview.css';

const PAGE_GAP = 16;

function px(value) {
  return Number.parseFloat(value) || 0;
}

function bottomOf(element, top) {
  return element.getBoundingClientRect().bottom - top;
}

function nextArticle(section) {
  const following = section.nextElementSibling;
  if (following?.tagName === 'SECTION') return following.querySelector(':scope > article');
  const page = section.cloneNode(false);
  const article = section.querySelector(':scope > article').cloneNode(false);
  page.appendChild(article);
  section.after(page);
  return article;
}

function directRows(table) {
  return [...table.rows].filter((row) => row.parentElement === table);
}

// Las filas pasan al principio de la continuación de su tabla en la hoja siguiente; si aún no
// existe, se crea una copia de la tabla con las mismas columnas.
function moveRows(table, rows, article) {
  let target = article.firstElementChild;
  if (target?.dataset.split !== table.dataset.split) {
    target = table.cloneNode(false);
    const columns = table.querySelector(':scope > colgroup');
    if (columns) target.appendChild(columns.cloneNode(true));
    article.prepend(target);
  }
  const first = directRows(target)[0] || null;
  rows.forEach((row) => target.insertBefore(row, first));
}

// El dibujo del Word sale en una sola hoja larga. Se reparte en hojas A4 como lo hace Word:
// las filas de la tabla no se parten (cantSplit), así que la fila que no cabe pasa entera a la
// hoja siguiente. Tras cada corte se vuelve a medir la hoja, porque al quitar filas la tabla
// puede recalcular sus columnas y las que quedan crecer.
function paginate(wrapper) {
  let section = wrapper.querySelector(':scope > section');
  if (!section) return;
  const style = getComputedStyle(section);
  const limit = px(style.minHeight) - px(style.paddingTop) - px(style.paddingBottom);
  if (limit <= 0) return;
  wrapper.querySelectorAll('table').forEach((table, index) => { table.dataset.split = String(index); });

  for (let guard = 0; guard < 500 && section; guard += 1) {
    const article = section.querySelector(':scope > article');
    const top = article.getBoundingClientRect().top;
    const blocks = [...article.children];
    // El párrafo vacío de una línea mínima que Word exige tras la tabla no abre una hoja nueva.
    const index = blocks.findIndex((block) => bottomOf(block, top) > limit + 1 && block.offsetHeight > 3);
    const block = blocks[index];
    const rows = block?.tagName === 'TABLE' ? directRows(block) : [];
    const cut = rows.findIndex((row) => bottomOf(row, top) > limit + 1);
    // Nada se pasa, o lo que se pasa es lo primero de la hoja y no se puede partir: hoja siguiente.
    if (index < 0 || (index === 0 && cut <= 0)) {
      const following = section.nextElementSibling;
      section = following?.tagName === 'SECTION' ? following : null;
      continue;
    }
    const target = nextArticle(section);
    const rest = blocks.slice(index + 1);
    if (cut > 0) {
      target.prepend(...rest);
      moveRows(block, rows.slice(cut), target);
    } else {
      target.prepend(block, ...rest);
    }
  }
}

// docx-preview dibuja cada tabulación como un span con un espacio largo (em space) y no respeta
// las paradas del párrafo. Se leen del Word, en el mismo orden en que aparecen, y se aplican:
// "PROFORMA" va en una parada izquierda fija y VOY y su número en una derecha al borde de la celda.
const TAB_TEXT = String.fromCharCode(0x2003);
const DEFAULT_TAB = 708;
const TWIPS_PER_PX = 15;

function readTabStops(documentXml) {
  const tabs = [];
  for (const [paragraph] of documentXml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)) {
    const count = (paragraph.match(/<w:tab\/>/g) || []).length;
    if (!count) continue;
    const defined = paragraph.match(/<w:tabs>([\s\S]*?)<\/w:tabs>/);
    const stops = defined
      ? [...defined[1].matchAll(/<w:tab w:val="(\w+)"[^>]*w:pos="(\d+)"/g)]
        .filter(([, val]) => val !== 'clear')
        .map(([, val, pos]) => ({ val, pos: Number(pos) / TWIPS_PER_PX }))
        .sort((a, b) => a.pos - b.pos)
      : [];
    for (let i = 0; i < count; i += 1) tabs.push(stops);
  }
  return tabs;
}

function followingWidth(tab) {
  const range = document.createRange();
  range.setStartAfter(tab);
  range.setEndAfter(tab.closest('p').lastChild);
  return range.getBoundingClientRect().width;
}

function alignTabs(wrapper, tabStops) {
  const spans = [...wrapper.querySelectorAll('p span')]
    .filter((span) => !span.children.length && span.textContent === TAB_TEXT);
  if (spans.length !== tabStops.length) return;
  spans.forEach((tab, index) => {
    const paragraph = tab.closest('p');
    const style = getComputedStyle(paragraph);
    const origin = paragraph.getBoundingClientRect().left + Number.parseFloat(style.paddingLeft || 0);
    const x = tab.getBoundingClientRect().left - origin;
    const stop = tabStops[index].find((item) => item.pos > x + 1)
      ?? { val: 'left', pos: (Math.floor(x / (DEFAULT_TAB / TWIPS_PER_PX)) + 1) * (DEFAULT_TAB / TWIPS_PER_PX) };
    const room = paragraph.clientWidth - Number.parseFloat(style.paddingLeft || 0) - Number.parseFloat(style.paddingRight || 0);
    let width = Math.min(stop.pos, room) - x;
    // Un píxel menos: una parada justo en el borde de la celda haría saltar la línea por redondeo.
    if (stop.val === 'right') width -= followingWidth(tab) + 1;
    if (stop.val === 'center') width -= followingWidth(tab) / 2 + 1;
    tab.textContent = '';
    tab.style.display = 'inline-block';
    tab.style.width = `${Math.max(width, 0)}px`;
    // Sin alto: el span lleva la letra por defecto (11 pt) y un min-height de esa letra; vacío,
    // alargaría su línea.
    tab.style.height = '0';
    tab.style.minHeight = '0';
  });
}

// Interlineado "sencillo" de Word con Arial: 1,15 veces el tamaño de la letra.
const WORD_SINGLE_LINE = 1.149;
const DEFAULT_MARK_PT = 11;

function paragraphMarks(documentXml) {
  return [...documentXml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map(([paragraph]) => {
    const props = (paragraph.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || [''])[0];
    const size = props.match(/<w:rPr>[\s\S]*?<w:sz w:val="(\d+)"/);
    return (size ? Number(size[1]) / 2 : DEFAULT_MARK_PT) * (96 / 72);
  });
}

// docx-preview deja cada párrafo con la letra de la página (16 px, Segoe UI) e interlineado 1: cada
// línea queda más alta que en Word y la tabla se va antes a la hoja siguiente. Se usa la letra del
// texto (o la de la marca de párrafo si está vacío) y el interlineado sencillo de Word.
function matchWordLines(wrapper, documentXml) {
  const paragraphs = [...wrapper.querySelectorAll('p')];
  const marks = paragraphMarks(documentXml);
  const sameCount = marks.length === paragraphs.length;
  const measured = paragraphs.map((paragraph, index) => {
    const style = getComputedStyle(paragraph);
    const runs = [...paragraph.querySelectorAll('span')]
      .filter((span) => !span.children.length && span.textContent.length && span.textContent !== TAB_TEXT)
      .map((span) => getComputedStyle(span));
    const sizes = runs.map((run) => Number.parseFloat(run.fontSize));
    return {
      ratio: Number.parseFloat(style.lineHeight) / Number.parseFloat(style.fontSize),
      size: sizes.length ? Math.max(...sizes) : (sameCount ? marks[index] : null),
      family: runs[0]?.fontFamily || 'Arial',
    };
  });
  paragraphs.forEach((paragraph, index) => {
    const { ratio, size, family } = measured[index];
    // Un interlineado exacto (como el párrafo de 1 pt tras la tabla) da una proporción muy baja.
    if (!Number.isFinite(ratio) || ratio < 0.9) return;
    if (size) paragraph.style.fontSize = `${size}px`;
    // Con otra letra en el párrafo, la línea mezcla dos alturas y crece.
    paragraph.style.fontFamily = family;
    // Los saltos de línea van en runs sin formato (11 pt); en Word no agrandan la línea.
    paragraph.querySelectorAll(':scope > span').forEach((span) => {
      if (span.childNodes.length === 1 && span.firstChild.nodeName === 'BR') span.style.fontSize = 'inherit';
    });
    paragraph.style.lineHeight = (ratio * WORD_SINGLE_LINE).toFixed(3);
  });
}

// En Word las tablas usan los anchos de columna de la plantilla (tblGrid). El navegador, con
// ancho automático, los reparte según el texto y las líneas se parten distinto.
function fixTableLayout(wrapper) {
  wrapper.querySelectorAll('table').forEach((table) => {
    const cols = [...table.querySelectorAll(':scope > colgroup > col')];
    const widths = cols.map((col) => (col.style.width.endsWith('pt') ? Number.parseFloat(col.style.width) : NaN));
    if (!cols.length || widths.some((width) => !Number.isFinite(width))) return;
    table.style.width = `${widths.reduce((a, b) => a + b, 0)}pt`;
    table.style.tableLayout = 'fixed';
  });
  // Word llena el renglón hasta el margen de la celda; el navegador redondea el ancho del texto
  // hacia arriba y parte antes textos que en Word entran justo (el encabezado derecho de NOTIFY
  // PARTY). Un píxel más de espacio por celda lo compensa.
  wrapper.querySelectorAll('td').forEach((cell) => {
    const right = Number.parseFloat(getComputedStyle(cell).paddingRight) || 0;
    if (right >= 1) cell.style.paddingRight = `${right - 1}px`;
  });
}

// docx-preview pone las imágenes flotantes (el logo) a la izquierda pero ignora su desplazamiento
// vertical y el espacio libre que piden debajo. Se aplican desde el Word, en el mismo orden.
const EMU_PER_PT = 12700;

function placeFloats(wrapper, documentXml) {
  const anchors = [...documentXml.matchAll(/<wp:anchor\b([^>]*)>([\s\S]*?)<\/wp:anchor>/g)].map(([, attrs, body]) => ({
    offset: Number((body.match(/<wp:positionV\b[^>]*>\s*<wp:posOffset>(-?\d+)<\/wp:posOffset>/) || [])[1] || 0),
    gap: Number((attrs.match(/distB="(\d+)"/) || [])[1] || 0),
  }));
  const floats = [...wrapper.querySelectorAll('div')].filter((div) => div.style.float);
  if (floats.length !== anchors.length) return;
  floats.forEach((float, index) => {
    float.style.marginTop = `${anchors[index].offset / EMU_PER_PT}pt`;
    float.style.marginBottom = `${anchors[index].gap / EMU_PER_PT}pt`;
  });
}

const SIDES = ['Top', 'Right', 'Bottom', 'Left'];

function contentWidth(cell) {
  const style = getComputedStyle(cell);
  return cell.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight);
}

// Safari dibuja todo borde de menos de 1 px (las líneas de 0,5 pt de Word) con un solo píxel
// físico, y con la hoja achicada eso queda por debajo de un píxel y no se dibuja: en el iPhone la
// tabla salía sin líneas. Con la hoja achicada cada borde fino pasa a 1 px (o a los píxeles físicos
// que hagan falta para que, achicado, mida al menos uno). El ancho que gana el borde se le quita al
// relleno de la celda, así el texto tiene el mismo espacio y se acomoda igual que antes.
function keepBordersVisible(wrapper, scale) {
  const ratio = window.devicePixelRatio || 1;
  const minimum = Math.max(1, Math.ceil(1 / scale) / ratio);
  const elements = [...wrapper.querySelectorAll('table, td')];
  const cells = elements.filter((element) => element.tagName === 'TD');
  // Se vuelve a lo que dibujó docx-preview antes de medir (el tamaño de la ventana puede cambiar).
  elements.forEach((element) => {
    if (element.dataset.original == null) {
      element.dataset.original = JSON.stringify(SIDES.map((side) => element.style[`border${side}Width`]));
      element.dataset.padding = element.style.paddingRight;
    }
    JSON.parse(element.dataset.original).forEach((width, index) => { element.style[`border${SIDES[index]}Width`] = width; });
    element.style.paddingRight = element.dataset.padding;
  });
  if (scale >= 1) return;
  const before = cells.map(contentWidth);
  const widths = elements.map((element) => {
    const style = getComputedStyle(element);
    return SIDES.map((side) => (['none', 'hidden'].includes(style[`border${side}Style`]) ? 0 : Number.parseFloat(style[`border${side}Width`]) || 0));
  });
  elements.forEach((element, index) => {
    widths[index].forEach((width, side) => {
      if (width > 0 && width < minimum) element.style[`border${SIDES[side]}Width`] = `${minimum}px`;
    });
  });
  const after = cells.map(contentWidth);
  cells.forEach((cell, index) => {
    const lost = before[index] - after[index];
    if (lost > 0) {
      const padding = Number.parseFloat(getComputedStyle(cell).paddingRight);
      cell.style.paddingRight = `${Math.max(padding - lost, 0)}px`;
    }
  });
}

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
    <path d="M15.5 15.5L21 21" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);

// Botón fijo "Vista Previa" y ventana con el Word que se generaría con los datos actuales.
const WordPreview = ({ buildData }) => {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ phase: 'idle' });
  const bodyRef = useRef(null);
  const pagesRef = useRef(null);
  const closeRef = useRef(null);
  // Los datos se leen al abrir: la vista previa muestra el formulario tal como está en ese momento.
  const buildRef = useRef(buildData);
  buildRef.current = buildData;

  const close = useCallback(() => setOpen(false), []);

  const fit = useCallback(() => {
    const body = bodyRef.current;
    const wrapper = pagesRef.current?.querySelector('.docx-preview-wrapper');
    const page = wrapper?.querySelector(':scope > section');
    if (!body || !page) return;
    // Se escala la imagen ya armada (transform) en vez de usar zoom: el zoom vuelve a acomodar el
    // texto y las hojas dejan de medir lo mismo que en Word.
    const room = body.clientWidth - 32;
    const scale = Math.min(1, room / page.offsetWidth);
    keepBordersVisible(wrapper, scale);
    wrapper.style.transformOrigin = 'top left';
    wrapper.style.transform = `scale(${scale})`;
    pagesRef.current.style.width = `${wrapper.offsetWidth * scale}px`;
    pagesRef.current.style.height = `${wrapper.offsetHeight * scale}px`;
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    const pages = pagesRef.current;
    setState({ phase: 'loading' });
    (async () => {
      try {
        const [{ renderAsync }, blob] = await Promise.all([
          import('docx-preview'),
          buildLocalProforma(buildRef.current()),
        ]);
        if (cancelled) return;
        pages.replaceChildren();
        await renderAsync(blob, pages, pages, {
          className: 'docx-preview',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          useBase64URL: true,
        });
        if (cancelled) return;
        const wrapper = pages.querySelector('.docx-preview-wrapper');
        const documentXml = new PizZip(await blob.arrayBuffer()).file('word/document.xml').asText();
        fixTableLayout(wrapper);
        placeFloats(wrapper, documentXml);
        matchWordLines(wrapper, documentXml);
        alignTabs(wrapper, readTabStops(documentXml));
        paginate(wrapper);
        fit();
        setState({ phase: 'ready' });
      } catch (err) {
        console.error(err);
        if (!cancelled) setState({ phase: 'error', message: err.message || 'No se pudo armar la vista previa' });
      }
    })();
    return () => {
      cancelled = true;
      pages?.replaceChildren();
    };
  }, [open, fit]);

  useEffect(() => {
    if (!open || !bodyRef.current) return undefined;
    const observer = new ResizeObserver(fit);
    observer.observe(bodyRef.current);
    return () => observer.disconnect();
  }, [open, fit]);

  return (
    <>
      <button type="button" className="word-preview-fab" onClick={() => setOpen(true)}>
        <SearchIcon />
        <span className="word-preview-fab-label">Vista Previa</span>
      </button>

      {open ? (
        <div
          className="word-preview-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Vista previa de la proforma"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div className="word-preview-card">
            <div className="word-preview-head">
              <h2 className="word-preview-title">Vista previa</h2>
              <button ref={closeRef} type="button" className="status-close" aria-label="Cerrar vista previa" onClick={close}>
                &times;
              </button>
            </div>
            <div className="word-preview-body" ref={bodyRef} style={{ '--page-gap': `${PAGE_GAP}px` }}>
              {state.phase === 'loading' ? (
                <div className="word-preview-state">
                  <div className="status-spinner" aria-hidden="true" />
                  <p>Armando la vista previa...</p>
                </div>
              ) : null}
              {state.phase === 'error' ? (
                <div className="word-preview-state word-preview-error">{state.message}</div>
              ) : null}
              <div
                ref={pagesRef}
                className="word-preview-pages"
                style={state.phase === 'ready' ? undefined : { visibility: 'hidden', position: 'absolute' }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default WordPreview;
