import React, { useRef, useState } from "react"
import "./App.css"
import _ from "lodash"
import { createSmartTeamGenerator } from "./smart"
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@material-ui/core"
import { FaGithub } from "react-icons/fa"

function App() {
  const [lhs, setLhs] = useState(2)
  const [rhs, setRhs] = useState(4)
  const inputsAreValid = lhs >= 1 && rhs >= 1 && lhs <= rhs

  const smartTeamParams = useRef({ lhs, rhs })
  const smartTeamGenerator = useRef(createSmartTeamGenerator(lhs + rhs, lhs))

  const [nextTeam, setNextTeam] = useState<number[] | undefined>(undefined)
  const [sheepCounts, setSheepCounts] = useState<
    Map<number, number> | undefined
  >(undefined)
  const [allPlayerCounts, setAllPlayerCounts] = useState<
    Map<number, number>[] | undefined
  >(undefined)

  const onGenerateButtonClicked = () => {
    if (!_.isEqual(smartTeamParams.current, { lhs, rhs })) {
      smartTeamParams.current = { lhs, rhs }
      smartTeamGenerator.current = createSmartTeamGenerator(lhs + rhs, lhs)
    }
    const { nextTeam, sheepCounts, allPlayerCounts } =
      smartTeamGenerator.current.next().value as any
    setNextTeam(nextTeam)
    setSheepCounts(sheepCounts)
    setAllPlayerCounts(allPlayerCounts)
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div>
        <div>
          <h1>
            Sheep Tag <code>-smart</code> Algorithm
          </h1>
          <p>
            Smart teams generator; players are indexed from 0 to numPlayers - 1.{" "}
          </p>
        </div>
        <div>
          <input
            type="number"
            value={lhs}
            onChange={(e) => setLhs(parseInt(e.target.value))}
          />
          <span> vs </span>
          <input
            type="number"
            value={rhs}
            onChange={(e) => setRhs(parseInt(e.target.value))}
          />
        </div>
        {!inputsAreValid && (
          <div style={{ color: "red", fontSize: "small" }}>
            {`Inputs must follow constraint: lhs >= 1 && rhs >= 1 && lhs <= rhs`}
          </div>
        )}
        <div className="top-gap">
          <button disabled={!inputsAreValid} onClick={onGenerateButtonClicked}>
            Generate teams
          </button>
          <a
            style={{ marginLeft: "10px" }}
            href="https://github.com/lesterfan/st-smart-algo#how-the-algorithm-works"
          >
            <FaGithub />
          </a>
        </div>
        {nextTeam && sheepCounts && allPlayerCounts && (
          <div className="top-gap">
            <div>
              <b>Chosen Team:</b>
              <span> {JSON.stringify(nextTeam)}</span>
            </div>
            <div className="top-gap">
              <b>Sheep Counts:</b>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Player Number</TableCell>
                      <TableCell>Sheep Count</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...sheepCounts.entries()].map(
                      ([playerNumber, sheepCount]) => (
                        <TableRow key={`sc-${playerNumber}`}>
                          <TableCell>{playerNumber}</TableCell>
                          <TableCell>{sheepCount}</TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
            <div className="top-gap">
              <b>Player Counts (adjacency matrix representation):</b>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell></TableCell>
                      {allPlayerCounts.map((_, p2) => (
                        <TableCell key={`pc-col-header-${p2}`}>{p2}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allPlayerCounts.map((playerCounts, p1) => (
                      <TableRow key={`pc-row-${p1}`}>
                        <TableCell>{p1}</TableCell>
                        {allPlayerCounts.map((_, p2) => (
                          <TableCell key={`pc-cell-${p1}-${p2}`}>
                            {p1 < p2 && playerCounts.get(p2)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
