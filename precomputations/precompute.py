#!/usr/local/bin/python3
from typing import Dict, List
import math
import collections
import itertools
import json
import argparse

from pkg_resources import require


def nCr(n: int, r: int):
    f = math.factorial
    return f(n) // f(r) // f(n - r)


def lcm(a, b):
    return abs(a * b) // math.gcd(a, b)


def isAdjFair(pcAdj: List[List[int]]) -> bool:
    n = len(pcAdj)
    target = None

    for r in range(1, n):
        for c in range(r + 1, n):
            if target is None:
                target = pcAdj[r][c]
            if pcAdj[r][c] != target or pcAdj[r][c] == 0:
                return False
    return True


def possibleNextTeams(numSheep: int, sheepCounts: Dict[int, int]):
    playersBySc = collections.defaultdict(list)
    minSc = float("inf")
    for playerNum, sc in sheepCounts.items():
        playersBySc[sc].append(playerNum)
        minSc = min(minSc, sc)

    requiredPlayers = []
    optionalPlayers = []

    # An invariant is that we're only going to have two sc levels
    if len(playersBySc[minSc]) <= numSheep:
        requiredPlayers += playersBySc[minSc]
        if len(requiredPlayers) < numSheep:
            optionalPlayers += playersBySc[minSc + 1]
    else:
        optionalPlayers += playersBySc[minSc]

    numFreeChoices = numSheep - len(requiredPlayers)
    for freeAgents in set(itertools.combinations(optionalPlayers, numFreeChoices)):
        yield [*requiredPlayers, *freeAgents]


def applyNextTeam(
    nextTeam: List[int],
    sheepCounts: Dict[int, int],
    pcAdj: List[List[int]],
    resultingTeams: List[List[int]],
):
    for playerNum in nextTeam:
        sheepCounts[playerNum] += 1
    for i in range(len(nextTeam)):
        for j in range(i + 1, len(nextTeam)):
            r = nextTeam[i]
            c = nextTeam[j]
            pcAdj[r][c] += 1
            pcAdj[c][r] += 1
    resultingTeams.append(nextTeam)


def sheepCountsStateIsFair(sheepCounts: Dict[int, int]) -> bool:
    return max(sheepCounts.values()) - min(sheepCounts.values()) <= 1


def unapplyNextTeam(
    nextTeam: List[int],
    sheepCounts: Dict[int, int],
    pcAdj: List[List[int]],
    resultingTeams: List[List[int]],
):
    for playerNum in nextTeam:
        sheepCounts[playerNum] -= 1
    for i in range(len(nextTeam)):
        for j in range(i + 1, len(nextTeam)):
            r = nextTeam[i]
            c = nextTeam[j]
            pcAdj[r][c] -= 1
            pcAdj[c][r] -= 1
    resultingTeams.pop()


numSequencesSearched = 0


def bruteForceSearch(
    depth: int,
    numSheep: int,
    sheepCounts: Dict[int, int],
    pcAdj: List[List[int]],
    # Outparameter: will be populated with sheep turns to execute
    resultingTeams: List[List[int]],
) -> bool:
    global numSequencesSearched
    if depth == 0:
        numSequencesSearched += 1
        print(f"{numSequencesSearched = }")
        # for row in sheepCounts.items():
        #     print(row)
        # for row in pcAdj:
        #     print(row)
        # for team in resultingTeams:
        #     print(team)
        # print()
        return isAdjFair(pcAdj)
    for nextTeam in possibleNextTeams(numSheep, sheepCounts):
        applyNextTeam(nextTeam, sheepCounts, pcAdj, resultingTeams)
        assert sheepCountsStateIsFair(sheepCounts)
        if bruteForceSearch(depth - 1, numSheep, sheepCounts, pcAdj, resultingTeams):
            return True
        unapplyNextTeam(nextTeam, sheepCounts, pcAdj, resultingTeams)
    return False


def calculate(numSheep: int, numWolves: int):
    numTotal = numSheep + numWolves

    # This is the number of slots in the player counts triangle
    # See visualization at https://lesterfan.github.io/st-smart-algo/
    numSlotsInAdjMatrix = numTotal * (numTotal - 1) // 2
    numSlotsFilledPerTurn = nCr(numSheep, 2)

    # We need to run a multiple of this to make sure every value in the
    # adjacency matrix is equal
    minTurnsToFillTriangle = lcm(numSlotsInAdjMatrix, numSlotsFilledPerTurn)

    sheepCounts = {playerNum: 0 for playerNum in range(numTotal)}
    pcAdj = [[0 for _ in range(numTotal)] for _ in range(numTotal)]

    resultingTeams = []

    if bruteForceSearch(
        minTurnsToFillTriangle, numSheep, sheepCounts, pcAdj, resultingTeams
    ):
        print(f"{numSheep = }, {numWolves = } was successful!")
        print()
        print("Sequence of teams:")
        for team in resultingTeams:
            print(team)
        print()
        print("Player counts (adjacency matrix):")
        for row in pcAdj:
            print(row)

        fileName = f"precomputed_{numSheep}v{numWolves}.json"
        print(f"(Writing result to file {fileName})")
        fileJson = {
            "numSheep": numSheep,
            "numWolves": numWolves,
            "numTotal": numTotal,
            "numSequencesSearched": numSequencesSearched,
            "teamSequences": resultingTeams,
            "adjacencyMatrix": pcAdj,
        }
        with open(fileName, "w") as f:
            f.write(json.dumps(fileJson, sort_keys=True))
    else:
        print("Unsuccessful!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Perform a brute force search to find -smart teams for sheep tag."
    )
    parser.add_argument("numSheep", type=int)
    parser.add_argument("numWolves", type=int)
    args = parser.parse_args()
    calculate(args.numSheep, args.numWolves)
