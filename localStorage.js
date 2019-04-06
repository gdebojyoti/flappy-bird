const localStore = {}

const isLocalStorageAccessible = (() => {
  let isStorageAccessible

  return function () {
    if (!isStorageAccessible) {
      isStorageAccessible = !!(window && window.localStorage)
    }
    return isStorageAccessible
  }
})()

function readLocalStorage (key) {
  try {
    if (
      isLocalStorageAccessible() &&
      window.localStorage[key] &&
      window.localStorage[key] !== 'undefined'
    ) {
      return window.localStorage[key]
    } else if (localStore[key]) {
      return localStore[key]
    }
    return null
  } catch (e) {
    return null
  }
}
function writeLocalStorage (key, value) {
  try {
    localStore[key] = value
    return isLocalStorageAccessible() && window.localStorage.setItem(key, value)
  } catch (e) {
    return null
  }
}

function deleteLocalStorage (key) {
  try {
    if (localStore[key]) {
      delete localStore[key]
    }
    return (
      isLocalStorageAccessible() &&
      key &&
      delete window.localStorage.removeItem(key)
    )
  } catch (e) {
    return null
  }
}

function getFromLocalStorage (key) {
  let offline = readLocalStorage('data')
  try {
    offline = JSON.parse(offline) || {}
  } catch (e) {
    offline = {}
  }
  return offline[key]
}

function addToLocalStorage (key, data) {
  let offline = readLocalStorage('data')
  try {
    offline = JSON.parse(offline) || {}
  } catch (e) {
    offline = {}
  }
  offline[key] = data
  writeLocalStorage('data', JSON.stringify(offline))
}
