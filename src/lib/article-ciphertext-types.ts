/** Stored in `articles.encrypted_content` as JSON (UTF-8 string). Shared by Node + browser. */
export type ArticleCiphertextEnvelopeV1 = {
  v: 1;
  alg: "AES-256-GCM";
  iv: string;
  ciphertext: string;
  tag: string;
};

export type ArticleCiphertextEnvelope = ArticleCiphertextEnvelopeV1;
