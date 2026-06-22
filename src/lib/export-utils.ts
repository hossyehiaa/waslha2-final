// CSV/Excel export utilities

/**
 * Convert array of objects to CSV string
 */
export function toCSV(data: Record<string, any>[], headers?: { key: string; label: string }[]): string {
  if (!data || data.length === 0) return ''

  // Determine columns
  const columns = headers || Object.keys(data[0]).map(key => ({ key, label: key }))

  // CSV header row
  const headerRow = columns.map(c => escapeCSV(c.label)).join(',')

  // CSV data rows
  const dataRows = data.map(row =>
    columns.map(c => escapeCSV(row[c.key] ?? '')).join(',')
  )

  return [headerRow, ...dataRows].join('\n')
}

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Download data as CSV file
 */
export function downloadCSV(data: Record<string, any>[], filename: string, headers?: { key: string; label: string }[]) {
  const csv = toCSV(data, headers)
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Download data as HTML table (opens in Excel)
 */
export function downloadExcel(data: Record<string, any>[], filename: string, headers?: { key: string; label: string }[]) {
  if (!data || data.length === 0) {
    downloadCSV(data, filename, headers)
    return
  }

  const columns = headers || Object.keys(data[0]).map(key => ({ key, label: key }))

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sheet1</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    </head>
    <body>
      <table border="1">
        <thead>
          <tr style="background-color:#0d9488;color:white;font-weight:bold;">
            ${columns.map(c => `<th>${escapeHTML(c.label)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `<tr>${columns.map(c => `<td>${escapeHTML(row[c.key] ?? '')}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.xls`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function escapeHTML(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Parse CSV string to array of objects
 */
export function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  // Parse header
  const headers = parseCSVLine(lines[0])

  // Parse data rows
  const results: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, j) => {
      row[h.trim()] = (values[j] || '').trim()
    })
    results.push(row)
  }
  return results
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}
