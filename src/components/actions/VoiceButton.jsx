// 音声入力ボタン（別モジュール統合予定）
export function VoiceButton({ onResult, style }) {
  return (
    <button style={{ ...style, opacity: 0.5 }} title="音声入力（別モジュール）">🎤</button>
  );
}
