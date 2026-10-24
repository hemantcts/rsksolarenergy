// The one test for wording that makes a warranty or guarantee sound like RSK Solar Energy's own.
// Only manufacturers' warranties exist. Shared by the writer and the checker, so a sentence the
// writer lets through is never stopped later for the same reason (it was: the checker's older,
// looser rule held "our note on solar inverter warranties").

/** The first sentence that claims a warranty or guarantee of ours, or undefined. */
export const ourWarrantySentence = (text) =>
  text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.?!'])\s+/)
    .find(
      (s) =>
        /\bwe guarantee\b|\bguaranteed by us\b/i.test(s) ||
        /\bwe (offer|give|provide|include|extend)\s+(\S+\s+){0,4}(warrant(y|ies)|guarantees?)\b/i.test(s) ||
        /\bour (own\s+)?(\S+\s+)?(warranty|warranties|guarantee)\b/i.test(s) ||
        /\bRSK Solar Energy['’]s (\S+\s+)?(warranty|guarantee)\b/i.test(s),
    );
