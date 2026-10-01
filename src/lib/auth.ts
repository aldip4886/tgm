import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "training-game-secret-key-for-ephemeral-tokens-32chars"
);

export interface ParticipantTokenPayload {
  participantId: string;
  sessionId: string;
  displayName: string;
}

export async function signParticipantToken(payload: ParticipantTokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

export async function verifyParticipantToken(token: string): Promise<ParticipantTokenPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return {
    participantId: payload.participantId as string,
    sessionId: payload.sessionId as string,
    displayName: payload.displayName as string,
  };
}
