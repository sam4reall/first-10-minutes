import React, { useState, useRef } from 'react';
import { Mic, MicOff, Camera, Upload, Send, Sparkles, AlertCircle, FileText, Globe } from 'lucide-react';
import { DEMO_SCENARIOS, DemoScenario } from '../data/demoScenarios';

interface Props {
  onAnalyze: (rawText: string, imageBase64?: string, source?: 'voice' | 'photo' | 'text' | 'paste') => void;
  isProcessing: boolean;
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
}

export const IngestionPanel: React.FC<Props> = ({
  onAnalyze,
  isProcessing,
  selectedLanguage,
  onSelectLanguage
}) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Web Speech API Voice Dictation (Hindi, Marathi, English)
  const toggleVoiceRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please type or paste your description.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;

    // Set recognition language
    if (selectedLanguage === 'hi') recognition.lang = 'hi-IN';
    else if (selectedLanguage === 'mr') recognition.lang = 'mr-IN';
    else recognition.lang = 'en-IN';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        finalTranscript += event.results[i][0].transcript;
      }
      setInputText(prev => prev ? `${prev} ${finalTranscript}` : finalTranscript);
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
      setIsListening(true);
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (source: 'voice' | 'photo' | 'text' | 'paste' = 'text') => {
    if (!inputText.trim() && !imagePreview) return;
    onAnalyze(inputText, imagePreview || undefined, source);
  };

  const handleLoadScenario = (sc: DemoScenario) => {
    setInputText(sc.rawInput);
    setImagePreview(null);
    onAnalyze(sc.rawInput, undefined, sc.inputSource);
  };

  return (
    <div className="space-y-4">
      {/* Demo Case Selector for Judges */}
      <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Try A Messy Case (5 Demo Scenarios)
          </span>
          <div className="flex items-center gap-1 text-xs">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedLanguage}
              onChange={(e) => onSelectLanguage(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi / Hinglish)</option>
              <option value="mr">मराठी (Marathi)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {DEMO_SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              onClick={() => handleLoadScenario(sc)}
              className="text-left p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all active:scale-[0.98] group"
            >
              <div className="text-xs font-bold text-slate-200 group-hover:text-blue-300 line-clamp-1">
                {sc.title}
              </div>
              <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                {sc.subtitle}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Primary Ingestion Input Area */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 relative overflow-hidden">
        {/* Shaky Voice / Panic Mode Microphone Callout */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Bystander Input (Voice, Typed Panic, Photos, Pasted News)
          </span>
          <span className="text-xs text-slate-500 font-mono">
            Key 1: AI Extracts Facts
          </span>
        </div>

        {/* Text Area */}
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Speak or paste emergency chaos here... (e.g. 'Mere dadaji ko chest pain ho raha hai, left arm me bhi dard hai, pass me sorbitrate ki goli hai!')"
          className="w-full h-28 bg-slate-950/80 text-slate-100 placeholder-slate-500 p-3.5 rounded-xl border border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-base resize-none font-medium leading-relaxed"
        />

        {/* Image Attachment Thumbnail */}
        {imagePreview && (
          <div className="relative inline-block mt-2">
            <img
              src={imagePreview}
              alt="Uploaded emergency pill strip or paper"
              className="h-20 w-32 object-cover rounded-lg border border-slate-700"
            />
            <button
              onClick={() => setImagePreview(null)}
              className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            {/* Panic Mode Mic Button */}
            <button
              onClick={toggleVoiceRecording}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                isListening
                  ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-500/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-5 h-5 text-white" />
                  <span>Listening... Stop</span>
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 text-red-400" />
                  <span>Panic Mic (Speak)</span>
                </>
              )}
            </button>

            {/* Photo / Pill Strip Attachment */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all active:scale-95"
            >
              <Camera className="w-4 h-4 text-blue-400" />
              <span>Attach Pill Strip / Photo</span>
            </button>
          </div>

          {/* Primary Evaluate Action */}
          <button
            onClick={() => handleSubmit('text')}
            disabled={isProcessing || (!inputText.trim() && !imagePreview)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black text-sm transition-all shadow-lg shadow-red-600/30 active:scale-95"
          >
            {isProcessing ? (
              <span>Extracting Facts...</span>
            ) : (
              <>
                <span>GENERATE ACTION PLAN</span>
                <Send className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
