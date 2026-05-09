import { useState, useEffect, useRef } from 'react';

const normalizeVoiceText = (text) => text.replace(/\s+/g, " ").trim();

const dedupeConsecutiveWords = (text) => {
  const words = normalizeVoiceText(text).split(" ").filter(Boolean);
  const compactWords = [];

  for (const word of words) {
    const previousWord = compactWords[compactWords.length - 1];
    if (!previousWord || previousWord.toLowerCase() !== word.toLowerCase()) {
      compactWords.push(word);
    }
  }

  return compactWords.join(" ");
};

function VoiceFloatingButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-40 group"
      title="Voice Command"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    </button>
  );
}

export default function VoiceModal({ isOpen, onClose }) {
  const [showModal, setShowModal] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedEntry, setParsedEntry] = useState(null);
  const recognitionRef = useRef(null);
  const lastTranscriptRef = useRef('');

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('speech recognition not supported');
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = 'en-IN';
    recognitionRef.current.interimResults = true;
    recognitionRef.current.continuous = false;
    recognitionRef.current.maxAlternatives = 1;

    recognitionRef.current.onstart = () => {
      console.log('speech recognition started');
      setIsListening(true);
    };

    recognitionRef.current.onresult = (event) => {
      const finalTranscript = Array.from(event.results)
        .slice(event.resultIndex)
        .filter((result) => result.isFinal)
        .map((result) => result[0]?.transcript || '')
        .join(' ');
      const cleanedTranscript = dedupeConsecutiveWords(finalTranscript);

      if (cleanedTranscript && cleanedTranscript.toLowerCase() !== lastTranscriptRef.current.toLowerCase()) {
        lastTranscriptRef.current = cleanedTranscript;
        console.log('Recognized:', cleanedTranscript);
        setTranscript(cleanedTranscript);
        parseCommand(cleanedTranscript);

        // send notification
        if (window.addNotification) {
          window.addNotification('Voice command captured successfully!', 'success');
        }
      }
    };

    recognitionRef.current.onend = () => {
      console.log('Speech recognition ended');
      setIsListening(false);
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);

      let errorMsg = 'Voice recognition failed. ';
      if (event.error === 'not-allowed') {
        errorMsg += 'Please allow microphone access.';
      } else if (event.error === 'no-speech') {
        errorMsg += 'No speech detected. Please try again.';
      } else {
        errorMsg += 'Please try again.';
      }

      if (window.addNotification) {
        window.addNotification(errorMsg, 'error');
      }
    };
  }, []);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const parseCommand = (text) => {
    setIsProcessing(true);
    setErrorMessage('');
    fetch('http://localhost:8000/smart-entries/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || 'Could not understand the command.');
        }setParsedEntry(data);})
      .catch((error) => {
        setParsedEntry(null);
        setErrorMessage(error.message || 'Could not understand the command.');
      }).finally(() => setIsProcessing(false));
  };
  const toggleListening = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (isListening) {
        setIsListening(false);
      } else {
        alert('Speech recognition not supported. Using browser\'s built-in recognition.');
      } return;
    }
    if (isListening) {
      console.log('Stopping recognition...');
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {try {
        console.log('Starting recognition...');
        lastTranscriptRef.current = '';
        recognitionRef.current?.start();
      } catch (e) {
        console.error('Failed to start recognition:', e);
        alert('Failed to start voice recognition. Please allow microphone access and try again.');
        setIsListening(false);
      }
    }
  };
  const reset = () => {
    setTranscript('');
    setParsedEntry(null);
    setErrorMessage('');
  };
  const modalOpen = isOpen || showModal;
  return (
    <>
      <VoiceFloatingButton onClick={() => setShowModal(true)} />

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>Voice Commands</h2>
                  <p className="text-sm text-slate-500">Speak an expense, income, or savings goal</p>
                </div>
              </div>
              <button onClick={() => { onClose?.(); setShowModal(false); }} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={toggleListening}
                  disabled={isProcessing}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isListening
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : isProcessing ? 'bg-slate-200' : 'bg-purple-500 hover:bg-purple-600'
                    } shadow-lg`}
                >
                  {isProcessing ? (
                    <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  )}
                </button>
                <p className="text-sm text-slate-600 font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {isListening ? 'Listening...' : isProcessing ? 'Analyzing Voice...' : 'Tap to start'}
                </p>
                <p className="text-center text-xs text-slate-500">
                  Speak clearly and stay in a quiet, noise-free place for the best result.
                </p>
              </div>

              {transcript && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <p className="text-sm text-slate-700" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {transcript}
                  </p>
                </div>
              )}

              {errorMessage && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {errorMessage}
                </div>
              )}

              {parsedEntry && (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-slate-500">Type</p>
                        <p className="font-semibold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>
                          {parsedEntry.entry_type === 'income'
                            ? 'Income'
                            : parsedEntry.entry_type === 'saving_goal'
                            ? 'Savings Goal'
                            : 'Expense'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Amount</p>
                        <p className={`text-xl font-bold ${parsedEntry.entry_type === 'income' ? 'text-green-600' : parsedEntry.entry_type === 'saving_goal' ? 'text-amber-600' : 'text-red-600'}`} style={{ fontFamily: "'Playfair Display', serif" }}>
                          ₹{Number(parsedEntry.amount).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={reset}
                      className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      Try Again
                    </button>
                    <button
                      onClick={async () => {
                        const token = localStorage.getItem('token');
                        if (!token) {
                          setErrorMessage('Please sign in before saving voice entries.');
                          return;
                        }
                        if (!parsedEntry) return;

                        setIsSaving(true);
                        setErrorMessage('');

                        try {
                          const res = await fetch('http://localhost:8000/smart-entries/apply', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                              entry_type: parsedEntry.entry_type,
                              amount: Number(parsedEntry.amount),
                              description: parsedEntry.description || 'Voice Entry',
                              category: parsedEntry.category || null,
                              source: 'voice',
                              raw_text: transcript,
                            })
                          });
                          const data = await res.json().catch(() => ({}));
                          if (!res.ok) {
                            throw new Error(data.detail || 'Failed to save the voice entry.');
                          }

                          if (window.addNotification) {
                            window.addNotification(
                              `Saved ${parsedEntry.entry_type.replace('_', ' ')}: Rs ${Number(parsedEntry.amount).toFixed(2)} via voice command.`,
                              'success'
                            );
                          }
                          window.dispatchEvent(new Event('smartEntryAdded'));
                          reset();
                          onClose?.();
                          setShowModal(false);
                        } catch (error) {
                          setErrorMessage(error.message || 'Failed to save the voice entry.');
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      disabled={isSaving}
                      className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {isSaving ? 'Saving...' : 'Save Entry'}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Try saying:</p>
                <div className="flex flex-wrap gap-2">
                  {['Spent 50 on bus tickets', 'Salary received 25000', 'Save 100 for buying gifts'].map((example, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setTranscript(example);
                        parseCommand(example);
                      }}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full transition-colors"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {example}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Note: Microphone access required. Works best in Chrome/Edge.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}