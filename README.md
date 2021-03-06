# Sheep Tag `-smart` Algorithm

This project is hosted at https://lesterfan.github.io/st-smart-algo; try it out for yourself!

## Getting Started

This is a website created with `create-react-app` so to run it all you need to do is to clone the repo, `npm install` and `npm start`. The main code for the algorithm is in `src/smart.ts`; the rest implements a nice web UI in React around it.

## Problem Statement

We want to assign sheep teams for [Sheep Tag](https://www.sheeptag2.com/) in an equitable way such that each player gets to be sheep roughly equally and each pair of players appears on the same sheep team roughly equally as well.

## How the Algorithm Works

If the game format is precomputed, we just fetch the precomputed JSON and use that to determine the random teams with some permutation in the beginning to ensure randomness. The code to generate these precomputed JSON files is in `src/precomputations`, the greedy random approach works out pretty well for making these precomputations.

Otherwise, we take a best effort approach to choose teams given the info we have. I'm not aware of a super elegant way of doing this for the general case of picking teams of `k` players from a pool of `n`, so I just approach it as an optimization problem and try to solve it by making lots of random guesses.

Formally, given `n` players, `sheepCounts: Map<number, number>` and `allPlayerCounts: Map<number, number>[]`, we want to optimize some `objective(allPlayerCounts)` subject to the constraint that `max(sheepCounts) - min(sheepCounts) <= 1` (this ensures that nobody will be sheep twice before someone has been sheep once). I tried a few different objectives (you can try them for yourself in the code!) but I found that the one which worked the best by inspection is summing [L3 norms](<https://en.wikipedia.org/wiki/Norm_(mathematics)#p-norm>) of each player's player-counts together.

Ideally, we would want to do some sort of [gradient descent](https://en.wikipedia.org/wiki/Gradient_descent) given an initial guess or do some massaging of the problem to make this [convex](https://en.wikipedia.org/wiki/Convex_optimization), but I couldn't figure out a way to do this. Instead, I just take the big-brained approach of making `numTries` guesses of teams which fulfill the constraint and picking the team with the lowest `objective`. In practice, this turns out to be pretty efficient and comes up with reasonable teams, so maybe this is okay?

To make this more efficient at the cost of accuracy, you can lower `numTries` in the code. I set it to a default which seems to work reasonably even for larger inputs (e.g. 12v12).

## Future Work

- More precomputations!
- Add some nice UX to put in player numbers/names so that we could feasibly use this in actual games.
- Viewing sheep count and player counts as a timeseries?
