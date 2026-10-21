# Fundamentals of System Security (COMSM0122)
## Workshop 2: Breaking and Understanding Byzantine Fault Tolerance (BFT)

A lightweight educational simulation of a Byzantine Fault Tolerant consensus protocol implemented in Node.js. This repository investigates how distributed networks achieve agreement in the presence of malicious nodes, explores key vulnerabilities (equivocation, key theft, Sybil attacks, and quorum manipulation), and implements defensive hardening mechanisms.

---

## Table of Contents
1. [Core Mental Models](#core-mental-models)
2. [Project Architecture](#project-architecture)
3. [Installation & Setup](#installation--setup)
4. [Running Scenarios](#running-scenarios)
5. [Scenario Reflections (Parts 1–7)](#scenario-reflections-parts-17)
6. [Hardening Defenses (Part 8)](#hardening-defenses-part-8)
7. [Verification & Test Results](#verification--test-results)

---

## Core Mental Models

* **Trust the Protocol, Not Individual Participants:** Consensus guarantees emerge from mathematical quorum intersection and cryptographic evidence, never from the presumed honesty of single peers.
* **Authenticity $\neq$ Consistency:** A message bearing a cryptographically valid signature proves only identity/origin, not that the sender is telling the truth or broadcasting identical values to all peers.
* **Consensus as an Audit Trail:** Safe commit decisions require persisting `State + Evidence` (Commit Certificates with supermajority signatures) rather than raw state alone.

---

## Project Architecture

```text
bft-lab/
├── simulator.js        # Core consensus engine, vote tallying, quorum validation, commit certificates
├── node.js             # Participant representation (vote generation, state tracking)
├── network.js          # Message broadcast and transport abstraction
├── crypto.js           # Cryptographic signing, verification, and key management
├── attacks.js          # Reusable Byzantine behavior and attack primitives
├── package.json        # Dependencies and project metadata
└── scenarios/          # Executable experiment scripts
    ├── honest.js            # Baseline honest consensus run
    ├── byzantine.js         # Single rogue vote under 3f + 1 assumptions
    ├── equivocation.js      # Conflicting signed messages to different peers
    ├── key_theft.js         # Validator impersonation via stolen private key
    ├── sybil.js             # Unrestricted membership manipulation
    └── quorum_tampering.js  # Safety violation via weakened quorum thresholds
```

---

## Installation & Setup

### Prerequisites
* [Node.js](https://nodejs.org/) (version 18 or higher)
* `npm` package manager

### Setup
Clone the repository and install dependencies:
```bash
git clone <repository-url>
cd bft-lab
npm install
```

---

## Running Scenarios

Each scenario is packaged as an independent executable script:

```bash
# 1. Baseline honest execution
node scenarios/honest.js

# 2. Byzantine voting fault
node scenarios/byzantine.js

# 3. Equivocation attack
node scenarios/equivocation.js

# 4. Validator key compromise
node scenarios/key_theft.js

# 5. Sybil attack
node scenarios/sybil.js

# 6. Tampered quorum threshold
node scenarios/quorum_tampering.js
```

---

## Scenario Reflections (Parts 1–7)

### Part 1: The Trust Problem (`honest.js`)
* **Why was the proposed value accepted?** Every participant validated the format and independently broadcast matching votes. The network strictly followed the consensus protocol rules.
* **Did any individual node determine the outcome?** No. Consensus emerged collectively through decentralized validation; no individual node possessed authority over the final state.
* **What evidence exists that agreement occurred?** Every node verified incoming digital signatures and gathered signed votes matching the proposal, assembling an auditable tally that satisfied protocol rules.
* **What role did the quorum play?** In this 4-node topology, the quorum defined the required threshold ($Q = 3$). Once three valid signatures accumulated, the value was committed. Safety relies on overlapping voting thresholds rather than trusting peer intentions.

### Part 2: Byzantine Behaviour (`byzantine.js`)
* **Why did consensus still succeed?** The network adheres to the classical Byzantine Fault Tolerance requirement ($3f + 1$). In an $N = 4$ node deployment, the system tolerates $f = 1$ faulty participant.
* **Did the protocol need to determine exactly which node was malicious?** No. BFT protocols do not need to identify or convict bad actors; they rely on quorum arithmetic.
* **How many Byzantine nodes can this deployment tolerate?** Exactly one ($f = 1$).
* **What assumption is the protocol making?** The protocol assumes that strictly fewer than one-third of participants are malicious ($f < N/3$) and that network channels permit reliable communication among honest nodes.

### Part 3: Equivocation (`equivocation.js`)
* **Are the messages correctly signed?** Yes. All conflicting messages sent by the attacker bear valid cryptographic signatures created with its legitimate private key.
* **Why is equivocation more dangerous than a simple incorrect vote?** A simple bad vote is easily outvoted. Equivocation partitions node perception across the network, attempting to convince different subsets of honest nodes to commit conflicting values.
* **Could an individual recipient detect the attack?** No. In isolation, the incoming message appears authentic and well-formed; the recipient cannot know a conflicting payload was dispatched to another node.
* **Why must nodes exchange evidence with one another?** Cryptographic authenticity proves origin, not consistency. Nodes must cross-gossip received messages so the network can detect that a single sender signed conflicting payloads in the same round.

### Part 4: Cryptographic Evidence and Key Theft (`key_theft.js`)
* **Can honest nodes distinguish a forged message from a legitimate one?** No. Honest peers verify the forged signature using the victim's public key, which passes cryptographic verification identically.
* **Why does signature verification succeed?** Verification only evaluates mathematical alignment between public key, payload, and signature; it cannot determine the physical identity of whoever operated the private key.
* **What assumptions does the protocol make about cryptographic keys?** The protocol assumes that private keys remain confidential, uncompromised, and exclusively operated by authorized validators.
* **What happens if those assumptions become invalid?** The security model collapses. An attacker can impersonate the victim indefinitely. Consensus logic cannot defend against stolen credentials; key revocation and lifecycle controls are required.

### Part 5: Sybil Attacks & Membership Management (`sybil.js`)
* **Who decides which nodes may participate?** Without admission control, nobody regulates participation; any entity can spawn identities ($X_1, X_2$, etc.) and submit votes.
* **Why does consensus not automatically solve the identity problem?** Consensus protocols only coordinate agreement among a given set of nodes; they do not dictate who belongs in that set.
* **How do blockchain systems attempt to prevent Sybil attacks?** Permissioned systems use centralized/federated PKI and explicit validator allowlists. Permissionless systems enforce economic/resource barriers (Proof-of-Work, Proof-of-Stake).
* **What happens if an attacker controls a majority of identities?** The $f < N/3$ bound is broken. The attacker gains decisive voting power, controls quorum calculations, and can arbitrarily dictate or halt consensus.

### Part 6: Quorum Reasoning and Safety (`quorum_tampering.js`)
* **Why does the modified quorum rule fail?** Lowering the quorum threshold (e.g., from 3 down to 2 in a 4-node network) destroys the quorum intersection property.
* **What property has been lost?** Quorum intersection (consensus safety).
* **Can multiple values reach quorum simultaneously?** Yes. Disjoint sets of nodes (e.g., $\{A, B\}$ and $\{C, D\}$) can each independently reach a quorum of 2 and commit conflicting values in the same round.
* **Why must future quorums overlap with previous quorums?** Quorums must overlap by at least $f + 1$ nodes to guarantee that any new quorum contains at least one honest participant from the previous decision, preventing conflicting commit certificates.

### Part 7: Breaking BFT
* **Which trust assumption was violated?** Honest majority behavior and parameter invariance.
* **Is this a protocol, infrastructure, governance, or application issue?** It represents a combined protocol parameter vulnerability and infrastructure/governance failure.
* **Did safety fail? Did availability fail?** Both failed. Safety failed because disjoint subsets committed contradictory values. Availability failed because the network fractured into an irrecoverable state split.
* **Could the attack occur in a real deployment?** Yes. This occurs during misconfigured software deployments, dynamic reconfigurations where total node counts are miscalculated, or when bridge protocols use relaxed thresholds for speed.

---

## Hardening Defenses (Part 8)

The simulator engine was hardened against the observed vulnerabilities:

### 1. Equivocation Detection (`Task 8.1`)
* **Mechanism:** Integrated `checkEquivocation()` with an internal `equivocationLog`.
* **Behavior:** Tracks `(round, nodeId, value, recipient)`. If a node attempts to broadcast a second, conflicting value within the same round, the engine outputs `[ALERT] EQUIVOCATION DETECTED` and drops the rogue vote.

### 2. Key Protection & Revocation (`Task 8.2`)
* **Mechanism:** Added a `revokedKeys` governance registry and verification guard.
* **Behavior:** Once an identity compromise is flagged, calling `revoke(nodeId)` blocks subsequent messages signed by that key, preventing forged message acceptance even if signatures are mathematically valid.

### 3. Admission Control & Sybil Defense (`Task 8.3`)
* **Mechanism:** Enforced an authoritative `approvedValidators` allowlist in `Simulator`.
* **Behavior:** Rejects votes from unregistered phantom nodes ($X_1, X_2$, etc.) during message reception, protecting the quorum from identity-inflation attacks.

### 4. Quorum Rule Protection (`Task 8.4`)
* **Mechanism:** Implemented runtime sanity checking via `validateQuorum()`.
* **Formula:** Enforces the mandatory BFT supermajority invariant:
  $$\text{minimum} = \left\lfloor \frac{2 \times N}{3} \right\rfloor + 1$$
* **Behavior:** Throws an explicit error and aborts execution if any configuration attempts to lower the quorum threshold below mathematical safety limits.

### 5. Commit Certificates (`Task 8.5`)
* **Mechanism:** Upgraded state commit logic to generate structured commit evidence.
* **Output:** Produces a verified `COMMIT CERTIFICATE` object displaying the committed value alongside the array of validator IDs whose valid signatures formed the quorum.

---

## Verification & Test Results

| Scenario | Execution Command | Observed Result | Defense Verified |
| :--- | :--- | :--- | :--- |
| **Commit Certificate** | `node scenarios/honest.js` | Emits structured certificate signed by validators | Task 8.5 |
| **Byzantine Fault** | `node scenarios/byzantine.js` | Outvotes rogue node; commits correct value | Baseline BFT |
| **Equivocation** | `node scenarios/equivocation.js` | Emits `[ALERT] EQUIVOCATION DETECTED` | Task 8.1 |
| **Key Theft** | `node scenarios/key_theft.js` | Blocks forged message after `revokedKeys.add("A")` | Task 8.2 |
| **Sybil Attack** | `node scenarios/sybil.js` | Logs `[ADMISSION CONTROL] Rejected vote: "X1"` | Task 8.3 |
| **Quorum Tampering** | `node scenarios/quorum_tampering.js` | Aborts with `[SECURITY ALERT] Unsafe quorum size` | Task 8.4 |

---

## Authors & Acknowledgements
* **Course:** Fundamentals of System Security (COMSM0122)
* **Unit Director Collaborator:** `systemsecuritybcsg`
