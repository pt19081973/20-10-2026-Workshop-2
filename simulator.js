const Network = require("./network");
const QuorumEngine = require("./quorum");

class Simulator {

    constructor(
        nodes,
        customQuorumEngine = null,
        approvedValidators = ["A", "B", "C", "D"]
    ) {
        this.nodes = nodes;
        this.network = new Network();

        this.quorum =
            customQuorumEngine ||
            new QuorumEngine(
                nodes.length
            );

        // Task 8.4: Protect Quorum Rules (Sanity Check)
        this.validateQuorum();

        // Task 8.3: Admission Control Allowlist
        this.approvedValidators = approvedValidators;

        // Task 8.1: Equivocation Evidence Log
        this.equivocationLog = [];
    }

    /**
     * Task 8.4: Quorum Rule Sanity Checking
     * Ensures quorum meets the BFT supermajority threshold: floor((2 * N) / 3) + 1
     */
    validateQuorum() {
        const totalNodes = this.nodes.length;
        const minimum = Math.floor((2 * totalNodes) / 3) + 1;
        const configuredSize = this.quorum.size();

        if (configuredSize < minimum) {
            throw new Error(
                `[SECURITY ALERT] Unsafe quorum size: Configured size (${configuredSize}) is less than required minimum (${minimum}) for ${totalNodes} nodes.`
            );
        }
    }

    /**
     * Task 8.1: Check and log equivocation attempts
     */
    checkEquivocation(round, vote) {
        const priorVote = this.equivocationLog.find(
            entry => entry.round === round && entry.nodeId === (vote.nodeId || vote.sender || vote.id)
        );

        const senderId = vote.nodeId || vote.sender || vote.id;

        if (priorVote) {
            if (priorVote.value !== vote.value) {
                console.error(`\n-----------------------------------------`);
                console.error(`[ALERT] EQUIVOCATION DETECTED in Round ${round}!`);
                console.error(`Node ${senderId} previously sent: "${priorVote.value}" to ${priorVote.recipient || "peer"}`);
                console.error(`Node ${senderId} now sent: "${vote.value}" to ${vote.recipient || "peer"}`);
                console.error(`-----------------------------------------\n`);
                return true; // Equivocation detected
            }
        }

        this.equivocationLog.push({
            round: round,
            nodeId: senderId,
            value: vote.value,
            recipient: vote.recipient || "broadcast"
        });

        return false;
    }

    runConsensus(value, round = 1) {

        console.log(
            "\n===================="
        );

        console.log(
            `Proposal: ${value}`
        );

        console.log(
            "===================="
        );

        const votes = [];

        /*
         * Request votes from all nodes
         */
        for (const node of this.nodes) {

            // Task 8.3: Admission Control Check (Sybil Prevention)
            if (!this.approvedValidators.includes(node.id)) {
                console.warn(
                    `[ADMISSION CONTROL] Rejected vote: "${node.id}" is not an approved validator.`
                );
                continue;
            }

            const vote =
                node.vote(value);

            // Ensure nodeId is present on the vote object
            vote.nodeId = vote.nodeId || node.id;

            // Task 8.1: Detect and reject equivocating votes
            if (this.checkEquivocation(round, vote)) {
                console.warn(
                    `[REJECTED] Equivocating vote from ${node.id} discarded.`
                );
                continue;
            }

            votes.push(vote);

            console.log(
                `${node.id} voted ${vote.value}`
            );
        }

        /*
         * Count votes
         */
        const tally = {};

        for (const vote of votes) {

            tally[vote.value] =
                (tally[vote.value] || 0) + 1;
        }

        console.log("\nVote Tally");

        console.table(tally);

        console.log(
            `Required Quorum = ${this.quorum.size()}`
        );

        /*
         * Find all values that
         * satisfy quorum.
         */
        const winners = [];

        for (const candidate in tally) {

            const voteCount =
                tally[candidate];

            if (
                this.quorum.reached(
                    voteCount
                )
            ) {
                winners.push({
                    value: candidate,
                    votes: voteCount
                });
            }
        }

        /*
         * Decision & Task 8.5 Commit Certificate
         */
        let certificate = null;

        if (
            winners.length === 0
        ) {

            console.log(
                "\nNO CONSENSUS"
            );

        }
        else if (
            winners.length === 1
        ) {
            const committedValue = winners[0].value;

            // Task 8.5: Build Commit Certificate
            const supportingSigners = votes
                .filter(v => String(v.value) === String(committedValue))
                .map(v => v.nodeId || v.sender || v.id);

            certificate = {
                value: committedValue,
                signatures: supportingSigners
            };

            // Output format specified on Page 11 & 12 of manual
            console.log("\nCOMMIT CERTIFICATE");
            console.log(`Value = ${certificate.value}`);
            console.log("Signed by:");
            certificate.signatures.forEach(signer => {
                console.log(`  ${signer}`);
            });
            console.log("");
        }
        else {

            console.log(
                "\nSAFETY VIOLATION!"
            );

            console.log(
                "Multiple values reached quorum:"
            );

            console.table(winners);
        }

        return {

            proposal: value,
            votes,
            tally,
            winners,
            certificate

        };
    }
}

module.exports = Simulator;
