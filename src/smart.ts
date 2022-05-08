import _ from "lodash"
import { strict as assert } from "assert"

const calculateL2Norm = (values: number[]): number => {
  let result = 0
  for (const value of values) {
    result += value * value
  }
  // No need to sqrt here
  return result
}

const calculateObjective = (possiblePlayerCounts: Map<number, number>[]) => {
  // It feels wonky calculating L2 norms of L2 norms, but I can't come up of a better
  // way of doing this.
  const norms = possiblePlayerCounts.map((playerCounts) =>
    calculateL2Norm([...(playerCounts?.values() || [])])
  )
  return calculateL2Norm(norms)
}

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
  numTries: number = 3000
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
