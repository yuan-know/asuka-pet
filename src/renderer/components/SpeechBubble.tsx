interface SpeechBubbleProps {
  message: string;
}

export function SpeechBubble({ message }: SpeechBubbleProps) {
  return <div className="speech-bubble">{message}</div>;
}
