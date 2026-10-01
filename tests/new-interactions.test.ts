import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/db";
import { createSession } from "../src/services/session.service";
import {
  createActivity,
  setActivityState,
  submitResponse,
  getPollResults,
  getWordCloudResults,
  getQAResults,
  getRankingResults,
  upvoteQAQuestion,
  setQAQuestionStatus,
} from "../src/services/activity.service";

describe("New Interaction Types", () => {
  let session: any;
  let part1: any;
  let part2: any;
  let part3: any;

  beforeEach(async () => {
    await prisma.event.deleteMany();
    await prisma.point.deleteMany();
    await prisma.whiteboard.deleteMany();
    await prisma.response.deleteMany();
    await prisma.sessionParticipant.deleteMany();
    await prisma.team.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    session = await createSession({
      title: "Interaction Test Session",
      facilitatorEmail: "facilitator@example.com",
      facilitatorName: "Maya Fac",
    });

    part1 = await prisma.sessionParticipant.create({
      data: {
        sessionId: session.id,
        displayName: "Participant One",
        role: "PARTICIPANT",
        token: "part-token-1",
      },
    });

    part2 = await prisma.sessionParticipant.create({
      data: {
        sessionId: session.id,
        displayName: "Participant Two",
        role: "PARTICIPANT",
        token: "part-token-2",
      },
    });

    part3 = await prisma.sessionParticipant.create({
      data: {
        sessionId: session.id,
        displayName: "Participant Three",
        role: "PARTICIPANT",
        token: "part-token-3",
      },
    });
  });

  describe("1. Live Polls", () => {
    it("records votes, handles re-votes by updating existing response, and aggregates tallies", async () => {
      const pollAct = await createActivity(session.id, {
        title: "Favorite Framework",
        prompt: "Which framework do you prefer?",
        type: "POLL",
        config: JSON.stringify({
          options: ["Next.js", "Remix", "SvelteKit", "Nuxt"],
        }),
      });
      await setActivityState(pollAct.id, "ACTIVE");

      // Participant 1 votes Next.js
      await submitResponse(pollAct.id, part1.id, {
        content: "Next.js",
      });

      // Participant 2 votes SvelteKit
      await submitResponse(pollAct.id, part2.id, {
        content: "SvelteKit",
      });

      // Participant 3 votes Next.js
      await submitResponse(pollAct.id, part3.id, {
        content: "Next.js",
      });

      let results = await getPollResults(pollAct.id);
      expect(results.totalVotes).toBe(3);
      expect(results.counts["Next.js"]).toBe(2);
      expect(results.counts["SvelteKit"]).toBe(1);
      expect(results.counts["Remix"]).toBe(0);

      // Participant 3 changes vote to Remix (re-vote)
      await submitResponse(pollAct.id, part3.id, {
        content: "Remix",
      });

      // Total votes should still be 3, not 4
      results = await getPollResults(pollAct.id);
      expect(results.totalVotes).toBe(3);
      expect(results.counts["Next.js"]).toBe(1);
      expect(results.counts["Remix"]).toBe(1);
      expect(results.counts["SvelteKit"]).toBe(1);
    });
  });

  describe("2. Competitive Quizzes", () => {
    it("validates correct answer, automatically awards challenge points, and blocks repeat submissions", async () => {
      const quizAct = await createActivity(session.id, {
        title: "Capital Cities",
        prompt: "What is the capital of France?",
        type: "QUIZ",
        config: JSON.stringify({
          options: ["Berlin", "Madrid", "Paris", "Rome"],
          correctAnswer: "Paris",
          points: 50,
        }),
      });
      await setActivityState(quizAct.id, "ACTIVE");

      // Participant 1 answers correctly: Paris
      const res1 = await submitResponse(quizAct.id, part1.id, {
        content: "Paris",
      });
      expect(res1.content).toBe("Paris");

      // Verify challenge score incremented by 50 for participant 1
      const updatedPart1 = await prisma.sessionParticipant.findUnique({
        where: { id: part1.id },
      });
      expect(updatedPart1?.totalPoints).toBe(50);

      // Participant 2 answers incorrectly: Berlin
      await submitResponse(quizAct.id, part2.id, {
        content: "Berlin",
      });

      // Verify challenge score did NOT increment for participant 2
      const updatedPart2 = await prisma.sessionParticipant.findUnique({
        where: { id: part2.id },
      });
      expect(updatedPart2?.totalPoints).toBe(0);

      // Participant 1 tries to submit again -> should be blocked
      await expect(
        submitResponse(quizAct.id, part1.id, {
          content: "Paris",
        })
      ).rejects.toThrow("already submitted an answer for this quiz");
    });
  });

  describe("3. Word Clouds", () => {
    it("aggregates phrases case-insensitively and returns sorted frequency list", async () => {
      const wordAct = await createActivity(session.id, {
        title: "One Word Check-in",
        prompt: "Describe your team spirit in one word",
        type: "WORD_CLOUD",
      });
      await setActivityState(wordAct.id, "ACTIVE");

      await submitResponse(wordAct.id, part1.id, {
        content: "Innovative",
      });

      await submitResponse(wordAct.id, part2.id, {
        content: "innovative",
      });

      await submitResponse(wordAct.id, part3.id, {
        content: "INNOVATIVE",
      });

      await submitResponse(wordAct.id, part1.id, {
        content: "Collaborative",
      });

      await submitResponse(wordAct.id, part2.id, {
        content: "collaborative",
      });

      await submitResponse(wordAct.id, part3.id, {
        content: "Energy",
      });

      const results = await getWordCloudResults(wordAct.id);
      expect(results.totalWords).toBe(6);
      expect(results.words.length).toBe(3);

      const topWord = results.words[0];
      expect(topWord.text).toBe("innovative");
      expect(topWord.count).toBe(3);

      const secondWord = results.words[1];
      expect(secondWord.text).toBe("collaborative");
      expect(secondWord.count).toBe(2);

      const thirdWord = results.words[2];
      expect(thirdWord.text).toBe("energy");
      expect(thirdWord.count).toBe(1);
    });
  });

  describe("4. Q&A Sessions", () => {
    it("supports anonymous questions, upvoting, and facilitator status moderation", async () => {
      const qaAct = await createActivity(session.id, {
        title: "Ask the Facilitator",
        prompt: "Submit your questions below",
        type: "QA",
      });
      await setActivityState(qaAct.id, "ACTIVE");

      // Anonymous question from part1
      const q1 = await submitResponse(qaAct.id, part1.id, {
        content: "Will we get a copy of the presentation?",
        color: "ANONYMOUS",
      });

      // Identified question from part2
      const q2 = await submitResponse(qaAct.id, part2.id, {
        content: "Can we extend the deadline for challenge 2?",
      });

      // Upvote q1 twice (by part2 and part3)
      await upvoteQAQuestion(q1.id, part2.id);
      await upvoteQAQuestion(q1.id, part3.id);

      // Upvote q2 once (by part1)
      await upvoteQAQuestion(q2.id, part1.id);

      // Facilitator marks q2 as SPOTLIGHT
      await setQAQuestionStatus(q2.id, "SPOTLIGHT");

      const questions = await getQAResults(qaAct.id);
      expect(questions.length).toBe(2);

      // Question marked SPOTLIGHT is prioritized first
      const firstQ = questions[0];
      expect(firstQ.id).toBe(q2.id);
      expect(firstQ.status).toBe("SPOTLIGHT");
      expect(firstQ.upvotes).toBe(1);
      expect(firstQ.isAnonymous).toBe(false);
      expect(firstQ.authorName).toBe("Participant Two");

      // Second question should be q1
      const secondQ = questions[1];
      expect(secondQ.id).toBe(q1.id);
      expect(secondQ.upvotes).toBe(2);
      expect(secondQ.isAnonymous).toBe(true);
      expect(secondQ.authorName).toBe("Anonymous");

      // Mark q1 as ANSWERED
      await setQAQuestionStatus(q1.id, "ANSWERED");
      const updatedQuestions = await getQAResults(qaAct.id);
      expect(updatedQuestions.find((q) => q.id === q1.id)?.status).toBe("ANSWERED");
    });
  });

  describe("5. Ranking / Item Prioritization", () => {
    it("aggregates item order using Borda count scoring", async () => {
      const rankAct = await createActivity(session.id, {
        title: "Feature Prioritization",
        prompt: "Prioritize what to build next",
        type: "RANKING",
        config: JSON.stringify({
          items: ["Security", "Performance", "UI Redesign"],
        }),
      });
      await setActivityState(rankAct.id, "ACTIVE");

      // part1 ranks: Security (1st), Performance (2nd), UI Redesign (3rd)
      // Scores: Security = 3, Performance = 2, UI Redesign = 1
      await submitResponse(rankAct.id, part1.id, {
        content: JSON.stringify(["Security", "Performance", "UI Redesign"]),
      });

      // part2 ranks: Security (1st), UI Redesign (2nd), Performance (3rd)
      // Scores: Security = 3, UI Redesign = 2, Performance = 1
      await submitResponse(rankAct.id, part2.id, {
        content: JSON.stringify(["Security", "UI Redesign", "Performance"]),
      });

      // part3 ranks: Performance (1st), Security (2nd), UI Redesign (3rd)
      // Scores: Performance = 3, Security = 2, UI Redesign = 1
      await submitResponse(rankAct.id, part3.id, {
        content: JSON.stringify(["Performance", "Security", "UI Redesign"]),
      });

      // Cumulative:
      // Security: 3 + 3 + 2 = 8
      // Performance: 2 + 1 + 3 = 6
      // UI Redesign: 1 + 2 + 1 = 4
      const results = await getRankingResults(rankAct.id);
      expect(results.totalSubmissions).toBe(3);
      expect(results.rankedItems[0].item).toBe("Security");
      expect(results.rankedItems[0].score).toBe(8);

      expect(results.rankedItems[1].item).toBe("Performance");
      expect(results.rankedItems[1].score).toBe(6);

      expect(results.rankedItems[2].item).toBe("UI Redesign");
      expect(results.rankedItems[2].score).toBe(4);
    });
  });
});
