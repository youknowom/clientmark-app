//save list
export const saveListState = (key, state) => {
  sessionStorage.setItem(key, JSON.stringify(state))
}

//get list
export const getListState = (key) => {
  const data = sessionStorage.getItem(key)
  return data ? JSON.parse(data) : null
}

//clear list
export const clearListState = (key) => {
  sessionStorage.removeItem(key)
}

