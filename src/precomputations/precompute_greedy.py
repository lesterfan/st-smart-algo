#!/usr/local/bin/python3
from copy import copy
from typing import List
import json
import argparse
import copy
import random
import os


from precompute_bruteforce import (
    applyNextTeam,
    isAdjFair,
    lcm,
    nCr,
    possibleNextTeams,
    unapplyNextTeam,
)


def calculateObjective(pcAdj: List[List[int]]):
    result = 0
    for row in pcAdj:
        result += sum(val**3 for val in row)
    return result


def getGoodRandomTeam(numSheep: int, sheepCounts: List[int], pcAdj: List[List[int]]):
    nextPossibleTeams = [team for team in possibleNextTeams(numSheep, sheepCounts)]
    numTeamsToTry = min(len(nextPossibleTeams), 10000)
    resultingTeam = []
    resultingObjective = float("inf")
    for team in random.sample(nextPossibleTeams, numTeamsToTry):
        tmpList = []
        applyNextTeam(team, sheepCounts, pcAdj, tmpList)
        objective = calculateObjective(pcAdj)
        unapplyNextTeam(team, sheepCounts, pcAdj, tmpList)
        if objective < resultingObjective:
            resultingTeam = team
            resultingObjective = objective
    return resultingTeam


numSequencesSearched = 0


def randomGreedySearch(
    minTurnsToFillTriangle: int,
    numSheep: int,
    startSheepCounts: List[int],
    startPcAdj: List[List[int]],
) -> List[List[int]]:
    global numSequencesSearched
    numWolves = len(startSheepCounts) - numSheep
    while True:
        for multiple in range(1, 5):
            for _ in range(100000):
                sheepCounts = copy.deepcopy(startSheepCounts)
                pcAdj = copy.deepcopy(startPcAdj)
                numTurnsToSimulate = multiple * minTurnsToFillTriangle
                currTeams = []
                for _ in range(numTurnsToSimulate):
                    currTeams.append(getGoodRandomTeam(numSheep, sheepCounts, pcAdj))
                    applyNextTeam(currTeams[-1], sheepCounts, pcAdj, [])
                numSequencesSearched += 1
                print(
                    f"{numSheep = }, {numWolves = }, {numSequencesSearched = }, {multiple = }, {minTurnsToFillTriangle = }"
                )
                if isAdjFair(pcAdj):
                    return currTeams, sheepCounts, pcAdj


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

    dir_path = os.path.dirname(os.path.realpath(__file__))
    fileName = f"{dir_path}/../../public/random_precomputed_{numSheep}v{numWolves}.json"

    resultingTeams, sheepCounts, pcAdj = randomGreedySearch(
        minTurnsToFillTriangle, numSheep, sheepCounts, pcAdj
    )
    print(f"{numSheep = }, {numWolves = } was successful!")
    print()
    print("Sequence of teams:")
    for team in resultingTeams:
        print(team)
    print()
    print("Player counts (adjacency matrix):")
    for row in pcAdj:
        print(row)

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


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Perform a brute force search to find -smart teams for sheep tag."
    )
    parser.add_argument("numSheep", type=int)
    parser.add_argument("numWolves", type=int)
    args = parser.parse_args()
    calculate(args.numSheep, args.numWolves)
