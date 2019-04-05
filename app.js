const requestAnimationFrame = window.requestAnimationFrame

let hasGameStarted = false
let isGameRunning = false
let isGameOver = false
let isKeyCurrentlyPressed = false

let scoreDomElm = null

let asphaltDomElm = null
let asphaltOffset = 0
let groundDomElm = null
let groundOffset = 0 // distance by which ground has moved
let groundSpeedFactor = 3

let birdVerticalSpeed = 0
let birdVerticalPosition = 0

const downForceFactor = 0.2
const jumpForceFactor = 4

let birdDomElm = null

let pipeCount = 1
const pipeWidth = 60
const pipeSpacing = 150
let pipeIdToBeDeleted = pipeCount

const pipeGapHeight = 90 // gap between upper & lower pipes
let currentGapLevel = 80 // lower-most point of upper pipe; i.e. upper-most point of gap
const gapDifference = 100 // maximum difference between consecutive gap levels
const safeZonePadding = 50 // safe zone - where no gaps will exist

let nextPipeId = 1 // ID of pipe that is to be crossed next

const visibleWidth = window.innerWidth + 2 * (pipeWidth + pipeSpacing) // width across which pipes are visible
const arenaHeight = Math.min(window.innerHeight, 300)
const maxAllowedHeight = window.innerHeight / 2 - 150
const maxAllowedDepth = window.innerHeight / 2 + 150

const initialize = () => {
  asphaltDomElm = document.getElementById('asphalt')
  groundDomElm = document.getElementById('ground')
  birdDomElm = document.getElementById('bird')
  scoreDomElm = document.getElementById('score')
}

const addEvents = () => {
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('keyup', onKeyUp)
  document.addEventListener('mousedown', onClick)

  document.getElementById('pause').addEventListener('mousedown', togglePause)
  document.getElementById('retry').addEventListener('click', onRetry)
}

const onKeyDown = ({ key }) => {
  // ignore if key is currently being pressed
  if (isKeyCurrentlyPressed) {
    return
  }

  switch (key) {
    case ' ': {
      runGame()
      isKeyCurrentlyPressed = true
      break
    }
    case 'Escape': {
      togglePause()
    }
  }
}

const onKeyUp = e => {
  isKeyCurrentlyPressed = false
}

const onClick = e => {
  runGame()
}

const runGame = () => {
  if (!isGameRunning && !isGameOver) {
    // remove 'Paused!' text on tap (except on first tap - which was to start game
    // both tap and 'space' work the same way
    togglePauseText()
  }

  if (!hasGameStarted) {
    hasGameStarted = true
  }

  if (!isGameRunning) {
    isGameRunning = true
  }

  birdVerticalSpeed = -jumpForceFactor
}

const togglePause = e => {
  // ignore if game hasn't started
  if (!hasGameStarted) {
    return
  }

  e && e.stopPropagation()
  isGameRunning = !isGameRunning

  togglePauseText()
}

const togglePauseText = () => {
  const element = document.getElementById('how-to')
  if (!element) {
    return
  }

  element.innerHTML = isGameRunning ? '' : 'Paused!'
}

const onRetry = () => {
  const retryElement = document.getElementById('retry')

  // exit if button does not exist
  if (!retryElement) {
    return
  }

  // update button text & prevent further clicks
  retryElement.innerHTML = 'Loading...'
  retryElement.style.pointerEvents = 'none'

  // NOTE: Temporary solution (reload to restart game); re-initialize game settings to avoid page reload
  window.location.reload()
}

// calculate height at which next gap should be created
const getNextGapLevel = () => {
  const randomDifference = Math.round(Math.random() * 2 * gapDifference - gapDifference)
  let tentativeLevel = currentGapLevel + randomDifference

  if (tentativeLevel <= safeZonePadding) {
    // too high
    return safeZonePadding
  } else if ((tentativeLevel + pipeGapHeight) > (arenaHeight - safeZonePadding)) {
    // too low
    return arenaHeight - pipeGapHeight - safeZonePadding
  }

  return tentativeLevel
}

const createPipe = () => {
  if (!groundDomElm) {
    return
  }

  currentGapLevel = getNextGapLevel()

  const pipeElm = createElement({
    type: 'div',
    className: 'pipe',
    id: `pipe-${pipeCount}`
  })
  // pipeElm.dataset.id = pipeCount
  const pipeUpperElm = createElement({
    type: 'div',
    className: 'pipe__upper',
    id: `pipe-${pipeCount}-upper`
  })
  pipeUpperElm.style.height = `${currentGapLevel}px`
  const pipeLowerElm = createElement({
    type: 'div',
    className: 'pipe__lower',
    id: `pipe-${pipeCount}-lower`
  })
  pipeLowerElm.style.height = `calc(100% - ${currentGapLevel}px - ${pipeGapHeight}px)`

  pipeElm.appendChild(pipeUpperElm)
  pipeElm.appendChild(pipeLowerElm)

  // place pipe & increment pipe count
  pipeElm.style.transform = `translateX(${(pipeWidth + pipeSpacing) * pipeCount++}px)`

  groundDomElm.appendChild(pipeElm)
}

const createElement = options => {
  const { type, className, id } = options
  const element = document.createElement(type)
  className && element.classList.add(className)
  element.id = id
  return element
}

// create a new pipe, if required; delete unused pipe; remove instructions
const updatePipes = () => {
  // trigger when ground moves every (pipeWidth + pipeSpacing) pixels
  if (groundOffset && groundOffset % (pipeWidth + pipeSpacing) === 0) {
    // create pipe
    createPipe()

    // if current left-most pipe has moved beyond user's screen (visibleWidth), delete it
    if (-groundOffset > visibleWidth) {
      const elm = document.getElementById(`pipe-${pipeIdToBeDeleted}`)
      if (elm) {
        groundDomElm.removeChild(elm)
        pipeIdToBeDeleted++
      }
    }
  }
}

const hasBirdCollided = () => {
  // exit if no bird exists
  if (!birdDomElm) {
    return false
  }

  const birdRect = birdDomElm.getBoundingClientRect()

  if (birdRect.top < maxAllowedHeight || birdRect.bottom > maxAllowedDepth) {
    return true
  }

  const upperPart = document.getElementById(`pipe-${nextPipeId}-upper`)
  const lowerPart = document.getElementById(`pipe-${nextPipeId}-lower`)

  // exit if pipe is not found
  if (!upperPart || !lowerPart) {
    return false
  }

  const upperRect = upperPart.getBoundingClientRect()
  const lowerRect = lowerPart.getBoundingClientRect()

  // Side effect: Update nextPipeId - refactor this to a separate function
  if (upperRect.right < birdRect.left) {
    // bird has crossed pipe; update nextPipeId
    nextPipeId++
    updateScore()
    console.log('crossed; next:', nextPipeId)

    // remove instructions when first pipe has been crossed
    if (nextPipeId === 2) {
      removeInstructions()
    }
  }

  return isColliding(birdRect, upperRect) || isColliding(birdRect, lowerRect)
}

const updateScore = () => {
  if (!scoreDomElm) {
    return
  }

  scoreDomElm.innerHTML = nextPipeId - 1
}

const isColliding = (a, b) => !(
  a.right < b.left ||
  a.left > b.right ||
  a.bottom < b.top ||
  a.top > b.bottom
)

const triggerGameOver = () => {
  isGameOver = true

  removeInstructions()

  // display final score board
  const board = document.getElementById('game-over')
  if (board) {
    board.style.display = 'flex'
  }

  const finalScore = nextPipeId - 1
  const highScore = Math.max(getCurrentHighScore(), finalScore)

  document.cookie = `highscore=${highScore};expires=Thu, 3 Dec 3013 12:00:00 UTC`

  const scoreElm = document.getElementById('go-board-score')
  const highScoreElm = document.getElementById('go-board-highscore')

  if (scoreElm) {
    scoreElm.innerHTML = finalScore
  }
  if (highScoreElm) {
    highScoreElm.innerHTML = highScore
  }
}

// remove instructions
const removeInstructions = () => {
  const element = document.getElementById('how-to')
  if (element) {
    element.innerHTML = ''
  }
}

const getCurrentHighScore = () => {
  const cookies = document.cookie.split(';') || []
  let highScore = 0

  cookies.forEach(cookie => {
    const splitted = cookie.split('=') || []
    if (splitted[0] === 'highscore') {
      highScore = splitted[1]
    }
  })

  return highScore
}

const forceBirdDown = () => {
  if (!birdDomElm) {
    return
  }

  birdVerticalSpeed += downForceFactor
  birdVerticalPosition += birdVerticalSpeed

  birdDomElm.style.transform = `translateY(${birdVerticalPosition}px)`
}

const render = timestamp => {
  if (isGameRunning && groundDomElm) {
    // move ground (and pipes)
    groundOffset -= groundSpeedFactor
    groundDomElm.style.transform = `translateX(${groundOffset}px)`

    // move asphalt
    asphaltOffset -= groundSpeedFactor
    asphaltDomElm.style.transform = `translateX(${asphaltOffset}px)`
    if (asphaltOffset < -6000) {
      asphaltOffset = 0
    }

    // bird always tries to come down
    forceBirdDown()

    updatePipes()

    // game over on collision
    if (hasBirdCollided()) {
      console.log('end')
      triggerGameOver()
    }
  }

  if (!isGameOver) {
    requestAnimationFrame(render)
  }
}

initialize()
addEvents()
requestAnimationFrame(render)
