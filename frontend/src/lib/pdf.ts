import { jsPDF } from 'jspdf'
import { toPng } from 'html-to-image'

/**
 * Renders a DOM element to an A4 PDF in the browser (no server cost). Capturing the element as an
 * image keeps Arabic text shaped correctly. Tall content is split across pages.
 */
export async function elementToPdf(el: HTMLElement, filename: string) {
  const png = await toPng(el, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true })
  const img = new Image()
  img.src = png
  await img.decode()

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const imgH = (img.height * pageW) / img.width

  let y = 0
  pdf.addImage(png, 'PNG', 0, y, pageW, imgH)
  while (imgH + y > pageH) {
    y -= pageH
    pdf.addPage()
    pdf.addImage(png, 'PNG', 0, y, pageW, imgH)
  }
  pdf.save(filename)
}
