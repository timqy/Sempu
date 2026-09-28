/**
 * Byte order mark. Skrivs som escape-sekvens och inte som tecken, eftersom
 * ett litteralt BOM i källkoden är osynligt och flaggas av linten.
 */
const BYTE_ORDER_MARK = '\uFEFF'

/**
 * Laddar ner en textfil från webbläsaren.
 *
 * Filen inleds med en BOM, annars tolkar Excel innehållet som Windows-1252 och
 * å, ä och ö blir obegripliga.
 */
export function downloadTextFile(fileName: string, content: string): void {
  const blob = new Blob([BYTE_ORDER_MARK, content], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()

  URL.revokeObjectURL(url)
}
