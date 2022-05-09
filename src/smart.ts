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
  numSheep: number,
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
  while (possibleTeam.length < numSheep) {
    const currPlayersBySc = playersGroupedBySc.get(currSc)
    if (currPlayersBySc) {
      if (currPlayersBySc.length <= numSheep - possibleTeam.length) {
        possibleTeam = [...possibleTeam, ...currPlayersBySc]
      } else {
        possibleTeam = [
          ...possibleTeam,
          ..._.sampleSize(currPlayersBySc, numSheep - possibleTeam.length),
        ]
      }
    }
    ++currSc
  }

  assert(possibleTeam.length === numSheep)
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
  numSheep: number,
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
      numSheep,
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

const applyNextTeam = (
  nextTeam: number[],
  prevSheepCounts: Map<number, number>,
  prevAllPlayerCounts: Map<number, number>[]
) => {
  let sheepCounts = _.cloneDeep(prevSheepCounts)
  for (const playerNum of nextTeam) {
    const currSc = sheepCounts.get(playerNum)!
    sheepCounts.set(playerNum, currSc + 1)
  }

  let allPlayerCounts = _.cloneDeep(prevAllPlayerCounts)
  for (let i = 0; i < nextTeam.length; ++i) {
    for (let j = i + 1; j < nextTeam.length; ++j) {
      const p1 = nextTeam[i]
      const p2 = nextTeam[j]
      const numTimesTogether = allPlayerCounts[p1]?.get(p2)
      allPlayerCounts[p1].set(p2, numTimesTogether! + 1)
      allPlayerCounts[p2].set(p1, numTimesTogether! + 1)
    }
  }

  return { sheepCounts, allPlayerCounts }
}

export async function* createSmartTeamGenerator(
  numSheep: number,
  numWolves: number,
  numTries: number = 5000
) {
  const numTotalPlayers = numSheep + numWolves
  assert(numSheep >= 1 && numWolves >= 1)
  let sheepCounts = new Map<number, number>()
  for (let i = 0; i < numTotalPlayers; ++i) {
    sheepCounts.set(i, 0)
  }
  let allPlayerCounts: Map<number, number>[] = Array(numTotalPlayers)
    .fill(undefined)
    .map(() => new Map<number, number>())
  for (let p1 = 0; p1 < numTotalPlayers; ++p1) {
    for (let p2 = p1 + 1; p2 < numTotalPlayers; ++p2) {
      allPlayerCounts[p1].set(p2, 0)
      allPlayerCounts[p2].set(p1, 0)
    }
  }
  try {
    // Use a precomputed team sequence if it exists
    const response = await fetch(
      `${process.env.PUBLIC_URL}/random_precomputed_${numSheep}v${numWolves}.json`
    )
    const { teamSequences } = await response.json()
    for (let i = 0; i < Infinity; ++i) {
      const nextTeam = teamSequences[i % teamSequences.length]
      ;({ sheepCounts, allPlayerCounts } = applyNextTeam(
        nextTeam,
        sheepCounts,
        allPlayerCounts
      ))
      yield { nextTeam, sheepCounts, allPlayerCounts, isPrecomputed: true }
    }
  } catch {
    // go for a best-effort greedy attempt otherwise
    while (true) {
      const { nextTeam, nextSheepCounts, nextAllPlayerCounts } = calculateTeam(
        numSheep,
        sheepCounts,
        allPlayerCounts,
        numTries
      )
      sheepCounts = nextSheepCounts
      allPlayerCounts = nextAllPlayerCounts
      yield { nextTeam, sheepCounts, allPlayerCounts, isPrecomputed: false }
    }
  }
}
