// Dalilak's chat kit: the building blocks of the onboarding conversation (/welcome) and the advisor panel «دليلك».
// Contract names: docs/DESIGN-BRIEF.md section 6. Motion: docs/COMPONENT-PLAYBOOK.md 3.2, 3.8, 3.12. Gallery: /dev/chat.
//
// Sides, in Arabic: «دليلك» speaks from the inline-start (the right) with his glyph; the user's messages sit at the
// inline-end (the left) with the user's avatar, the side of the composer's send button they pop out of.

// «دليلك»'s living mark and the one "working" line
export { DaleelGlyph, type DaleelGlyphProps, type DaleelState } from "./daleel-glyph";
export { RollingStatus, useElapsed, type RollingStatusProps } from "./rolling-status";
// the user's side
export { SentBubble, UserMessage, type SentBubbleProps, type SentEntrance, type UserMessageProps } from "./user-message";
// «دليلك»'s side
export {
  ActionReceipt,
  AdvisorMessage,
  ChatError,
  MessageCard,
  StoppedMark,
  type ActionReceiptProps,
  type AdvisorMessageProps,
  type AdvisorPart,
  type ChatErrorProps,
  type MessageCardProps,
} from "./advisor-message";
export { LightBlockView, LightInline, LightText, parseLight, type LightBlock } from "./light-text";
// chips
export { ReplyChips, type ReplyChip, type ReplyChipsProps } from "./reply-chips";
export { QuickReplies, quickReplyId, type QuickRepliesProps, type QuickReplyOption } from "./quick-replies";
// input, transcript, the apply flow
export { AttachChip, Composer, type AttachChipProps, type ComposerHandle, type ComposerProps } from "./composer";
export { ChatThread, type ChatThreadProps } from "./chat-thread";
export { TypedField, type TypedFieldProps } from "./typed-field";
