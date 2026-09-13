const formatDateTime = (dateValue) => {
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

export {formatDateTime};