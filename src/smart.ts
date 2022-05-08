import _ from "lodash"
import { strict as assert } from "assert"

// This one doesn't work very well unfortunately...
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const maxMinusMinObjective = (
  possibleAllPlayerCounts: Map<number, number>[]
) => {
  const allPlayerCounts = _.flatMap(possibleAllPlayerCounts, (playerCounts) => [
    ...playerCounts.values(),
  ])
  return Math.max(...allPlayerCounts) - Math.min(...allPlayerCounts)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const maxObjective = (possibleAllPlayerCounts: Map<number, number>[]) => {
  const allPlayerCounts = _.flatMap(possibleAllPlayerCounts, (playerCounts) => [
    ...playerCounts.values(),
  ])
  return Math.max(...allPlayerCounts) - Math.min(...allPlayerCounts)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const LpNormOfLkNorms = (
  possibleAllPlayerCounts: Map<number, number>[],
  p: number,
  k: number
) => {
  const result = _.sum(
    possibleAllPlayerCounts
      .map((playerCounts) =>
        _.sum([...playerCounts.values()].map((x) => Math.pow(x, k)))
      )
      .map((x) => Math.pow(x, p))
  )
  return result
}

// Change this objective to whatever you want to try
const calculateObjective = (possibleAllPlayerCounts: Map<number, number>[]) =>
  // maxMinusMinObjective(possibleAllPlayerCounts)
  // maxObjective(possibleAllPlayerCounts)
  LpNormOfLkNorms(possibleAllPlayerCounts, 1, 3)

const pickRandomGoodScTeam = (
  teamSize: number,
  sheepCounts: Map<number, number>
) => {
  let possibleTeam: number[] = []
  let possibleSheepCounts: Map<number, number> = _.cloneDeep(sheepCounts)

  const playersGroupedBySc = new Map<number, number[]>()
  for (const [playerNum, sc] of sheepCounts.entries()) {
    playersGroupedBySc.set(sc, [
      ...(playersGroupedBySc.get(sc) || []),
      playerNum,
    ])
  }

  // Randomly and greedily pick players starting at lower sc
  let currSc = Math.min(...sheepCounts.values())
  while (possibleTeam.length < teamSize) {
    const currPlayersBySc = playersGroupedBySc.get(currSc)
    if (currPlayersBySc) {
      if (currPlayersBySc.length <= teamSize - possibleTeam.length) {
        possibleTeam = [...possibleTeam, ...currPlayersBySc]
      } else {
        possibleTeam = [
          ...possibleTeam,
          ..._.sampleSize(currPlayersBySc, teamSize - possibleTeam.length),
        ]
      }
    }
    ++currSc
  }

  assert(possibleTeam.length === teamSize)
  for (const playerNum of possibleTeam) {
    const currSc = possibleSheepCounts.get(playerNum)!
    possibleSheepCounts.set(playerNum, currSc + 1)
  }

  assert(
    Math.max(...possibleSheepCounts.values()) -
      Math.min(...possibleSheepCounts.values()) <=
      1
  )
  return { possibleTeam, possibleSheepCounts }
}

const calculateTeam = (
  teamSize: number,
  sheepCounts: Map<number, number>,
  allPlayerCounts: Map<number, number>[],
  numTries: number
) => {
  let resultTeam: number[] = []
  let resultSheepCounts: Map<number, number> = sheepCounts
  let resultAllPlayerCounts: Map<number, number>[] = allPlayerCounts
  let resultObjective = Infinity
  for (let tryNum = 0; tryNum < numTries; ++tryNum) {
    const { possibleTeam, possibleSheepCounts } = pickRandomGoodScTeam(
      teamSize,
      sheepCounts
    )
    let possibleAllPlayerCounts = _.cloneDeep(allPlayerCounts)

    for (let i = 0; i < possibleTeam.length; ++i) {
      for (let j = i + 1; j < possibleTeam.length; ++j) {
        const p1 = possibleTeam[i]
        const p2 = possibleTeam[j]
        const numTimesTogether = possibleAllPlayerCounts[p1]?.get(p2)
        possibleAllPlayerCounts[p1].set(p2, numTimesTogether! + 1)
        possibleAllPlayerCounts[p2].set(p1, numTimesTogether! + 1)
      }
    }
    const currObjective = calculateObjective(possibleAllPlayerCounts)
    if (currObjective < resultObjective) {
      resultTeam = possibleTeam
      resultSheepCounts = possibleSheepCounts
      resultAllPlayerCounts = possibleAllPlayerCounts
      resultObjective = currObjective
    }
  }
  resultTeam.sort((a, b) => a - b)
  return {
    nextTeam: resultTeam,
    nextSheepCounts: resultSheepCounts,
    nextAllPlayerCounts: resultAllPlayerCounts,
  }
}

export function* createSmartTeamGenerator(
  numPlayers: number,
  teamSize: number,
  numTries: number = 5000
) {
  assert(numPlayers >= 1 && teamSize >= 1)
  let sheepCounts = new Map<number, number>()
  for (let i = 0; i < numPlayers; ++i) {
    sheepCounts.set(i, 0)
  }
  let allPlayerCounts: Map<number, number>[] = Array(numPlayers)
    .fill(undefined)
    .map(() => new Map<number, number>())
  for (let p1 = 0; p1 < numPlayers; ++p1) {
    for (let p2 = p1 + 1; p2 < numPlayers; ++p2) {
      allPlayerCounts[p1].set(p2, 0)
      allPlayerCounts[p2].set(p1, 0)
    }
  }
  while (true) {
    const { nextTeam, nextSheepCounts, nextAllPlayerCounts } = calculateTeam(
      teamSize,
      sheepCounts,
      allPlayerCounts,
      numTries
    )
    sheepCounts = nextSheepCounts
    allPlayerCounts = nextAllPlayerCounts
    yield { nextTeam, sheepCounts, allPlayerCounts }
  }
}
