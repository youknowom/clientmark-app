

//formate in (2025-09-17T16:11)
export const formatDateTimeLocal = (dateString) => {
  if (!dateString) return ''

  const date = new Date(dateString)
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60000)

  return localDate.toISOString().slice(0, 16)
}

export const formatDateWithTime = (dateString) => {
  if (!dateString) return ''

  const date = new Date(dateString)

  // Extract components
  const day = String(date.getDate()).padStart(2, '0') // dd
  const month = String(date.getMonth() + 1).padStart(2, '0') // mm (months are 0-indexed)
  const year = date.getFullYear() // yyyy

  const hours = String(date.getHours()).padStart(2, '0') // HH
  const minutes = String(date.getMinutes()).padStart(2, '0') // MM

  // Return in required format  ${hours}:${minutes}
  return `${day}-${month}-${year} `
}


//local time with AM:PM
export const formatDateTime = (dateValue) => {
  if (!dateValue) return ''

  const date = new Date(dateValue)

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()

  let hours = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, '0')

  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  hours = hours ? hours : 12 // convert 0 to 12
  hours = String(hours).padStart(2, '0')

  return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`
}
