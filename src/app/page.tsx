'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Sparkles, Loader2, Copy, Heart, Check, AlertTriangle,
  Flame, X, Edit3, Save, Lock, Unlock, History, Trash2,
  Rocket, Tag, WandSparkles, ShieldAlert, Eye, FileText, ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import {
  TopicType, TitleCandidate, HotTopic, EngagementScore
} from '@/lib/types';
import {
  SCENE_OPTIONS, PERSONA_OPTIONS, PERSONA_STYLE_CONFIG,
  KEYWORD_RECOMMENDATIONS
} from '@/lib/constants';

export default function Home() {
  // ==================== 场景选择 ====================
  const [topicType, setTopicType] = useState<TopicType>('market_hot');
  const [keywords, setKeywords] = useState('');
  const [deepAnalysis, setDeepAnalysis] = useState(false);

  // ==================== 人设选择 ====================
  const [personaType, setPersonaType] = useState<string>('hardcore_uncle');
  const [customPersona, setCustomPersona] = useState('');

  // ==================== 热榜数据 ====================
  const [hotTopics, setHotTopics] = useState<HotTopic[]>([]);
  const [hotTopicsLoading, setHotTopicsLoading] = useState(false);
  const [selectedHotTopic, setSelectedHotTopic] = useState<HotTopic | null>(null);
  const [hotTop3Tags, setHotTop3Tags] = useState<string[]>([]);

  // ==================== 历史记录 ====================
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // ==================== UI状态 ====================
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [viewMode, setViewMode] = useState<'integrated' | 'split'>('split');
  const [isEditing, setIsEditing] = useState(false);
  const [userEdited, setUserEdited] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [showTitlePreview, setShowTitlePreview] = useState(false);
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState<number | null>(null);

  // ==================== 输出状态 ====================
  const [titles, setTitles] = useState<TitleCandidate[]>([]);
  const [content, setContent] = useState('');
  const [editableContent, setEditableContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [compliance, setCompliance] = useState<{ isCompliant: boolean; warnings: string[]; fixed?: boolean }>({ isCompliant: true, warnings: [] });
  const [engagementScore, setEngagementScore] = useState<EngagementScore | null>(null);
  const [recommendedMusic, setRecommendedMusic] = useState<string[]>([]);

  // ==================== 计算属性 ====================
  const keywordsByScene = KEYWORD_RECOMMENDATIONS[topicType];
  const personaStyleConfig = PERSONA_STYLE_CONFIG[personaType as keyof typeof PERSONA_STYLE_CONFIG] || PERSONA_STYLE_CONFIG.custom;

  // ==================== 加载历史 ====================
  useEffect(() => {
    loadHistoryFromDB();
  }, []);

  const loadHistoryFromDB = async () => {
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setHistoryRecords(data.records || []);
      }
    } catch (e) {
      console.log('历史记录加载失败');
    }
  };

  // ==================== 标题生成 ====================
  const handleGenerateTitles = useCallback(async () => {
    if (!keywords.trim() && !selectedHotTopic) {
      toast.error('请输入关键词或选择热点');
      return;
    }

    setIsGenerating(true);
    setCurrentStep('正在分析主题...');
    setShowTitlePreview(true);

    try {
      const response = await fetch('/api/generate-titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicType, keywords, personaType }),
      });

      if (!response.ok) throw new Error('标题生成失败');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let titlesData: TitleCandidate[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'titles') {
                  titlesData = data.data;
                  setGeneratedTitles(titlesData.map(t => t.title));
                  setSelectedTitleIndex(0);
                }
              } catch (e) {}
            }
          }
        }
        toast.success('标题生成完成！请选择标题');
        setCurrentStep('');
      }
    } catch (error) {
      toast.error('标题生成失败');
    } finally {
      setIsGenerating(false);
    }
  }, [topicType, keywords, personaType, selectedHotTopic]);

  // ==================== 内容生成 ====================
  const handleGenerate = useCallback(async () => {
    if (selectedTitleIndex === null) {
      toast.error('请先选择一个标题');
      return;
    }

    setIsGenerating(true);
    setCurrentStep('正在生成内容...');

    const selectedTitle = generatedTitles[selectedTitleIndex];

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicType, keywords, deepAnalysis, personaType,
          hotTopicInfo: selectedHotTopic ? `${selectedHotTopic.title}\n${selectedHotTopic.snippet}` : undefined,
          hotTop3Tags,
          selectedTitle,
        }),
      });

      if (!response.ok) throw new Error('生成失败');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let accumulatedContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                switch (data.type) {
                  case 'status':
                    setCurrentStep(data.data);
                    break;
                  case 'titles':
                    setTitles(data.data);
                    break;
                  case 'content':
                    accumulatedContent += data.data;
                    setContent(accumulatedContent);
                    setEditableContent(accumulatedContent);
                    break;
                  case 'tags':
                    setTags(data.data);
                    break;
                  case 'images':
                    setImageUrls(data.data);
                    break;
                  case 'compliance':
                    setCompliance(data.data);
                    if (!data.data.isCompliant && !userEdited && data.data.fixedContent) {
                      setEditableContent(data.data.fixedContent);
                      setContent(data.data.fixedContent);
                    }
                    break;
                  case 'engagement_score':
                    setEngagementScore(data.data);
                    setCurrentStep('');
                    break;
                }
              } catch (e) {}
            }
          }
        }
        toast.success('生成完成！');
        setShowTitlePreview(false);
      }
    } catch (error) {
      console.error('生成错误:', error);
      toast.error('生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedTitleIndex, generatedTitles, topicType, keywords, deepAnalysis, personaType, selectedHotTopic, hotTop3Tags, userEdited]);

  // ==================== 复制内容 ====================
  const handleCopyContent = useCallback(() => {
    if (editableContent) {
      navigator.clipboard.writeText(editableContent);
      toast.success('已复制到剪贴板');
    }
  }, [editableContent]);

  // ==================== 渲染 ====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-rose-100">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-800">小红书爆款生成器</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="text-gray-600"
            >
              <History className="w-4 h-4 mr-1" />
              历史
            </Button>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('split')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'split' ? 'bg-white shadow text-gray-800' : 'text-gray-500'
                }`}
              >
                拆分
              </button>
              <button
                onClick={() => setViewMode('integrated')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'integrated' ? 'bg-white shadow text-gray-800' : 'text-gray-500'
                }`}
              >
                整合
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className={viewMode === 'split' ? 'grid grid-cols-2 gap-6' : ''}>
          {/* 左侧：输入区域 */}
          <div className={viewMode === 'split' ? '' : 'max-w-2xl mx-auto'}>
            {/* 场景选择 */}
            <Card className="mb-4 border-0 shadow-lg bg-white/90">
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 text-white text-sm flex items-center justify-center">1</span>
                  选择创作场景
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                {/* 场景卡片 */}
                <div className="grid grid-cols-2 gap-3">
                  {SCENE_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setTopicType(option.value)}
                      className={`p-4 rounded-xl text-left transition-all ${
                        topicType === option.value
                          ? 'bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-lg ring-2 ring-rose-300'
                          : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <span className="text-2xl mb-2 block">{option.emoji}</span>
                      <span className={`text-sm font-bold block ${topicType === option.value ? 'text-white' : 'text-gray-800'}`}>
                        {option.label}
                      </span>
                      <span className={`text-[11px] block mt-1 ${topicType === option.value ? 'text-rose-100' : 'text-gray-400'}`}>
                        {option.description}
                      </span>
                    </button>
                  ))}
                </div>

                {/* 深度分析开关 */}
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                  <div className="flex items-center gap-2">
                    <Rocket className={`w-4 h-4 ${deepAnalysis ? 'text-amber-500' : 'text-gray-400'}`} />
                    <div>
                      <span className="text-sm font-medium text-gray-700">深度分析</span>
                      <p className="text-[10px] text-gray-400">专业数据支撑、机构观点引用</p>
                    </div>
                  </div>
                  <Switch checked={deepAnalysis} onCheckedChange={setDeepAnalysis} />
                </div>
              </CardContent>
            </Card>

            {/* 关键词输入 */}
            <Card className="mb-4 border-0 shadow-lg bg-white/90">
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 text-white text-sm flex items-center justify-center">2</span>
                  核心关键词
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                <div className="relative">
                  <WandSparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="输入内容关键词，如：AI概念、机器人、半导体..."
                    className="pl-10 border-rose-200 focus:border-rose-400"
                  />
                </div>

                {/* 推荐关键词 */}
                <div className="flex flex-wrap gap-2">
                  {keywordsByScene.map((kw, i) => (
                    <button
                      key={i}
                      onClick={() => setKeywords(kw)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        keywords === kw
                          ? 'bg-rose-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 人设选择 */}
            <Card className="mb-4 border-0 shadow-lg bg-white/90">
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 text-white text-sm flex items-center justify-center">3</span>
                  选择创作人设
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {PERSONA_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setPersonaType(option.value)}
                      className={`p-3 rounded-xl text-center transition-all ${
                        personaType === option.value
                          ? 'bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-md'
                          : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <span className="text-xl mb-1 block">{option.emoji}</span>
                      <span className="text-xs font-medium block">{option.label}</span>
                    </button>
                  ))}
                </div>

                {/* 人设风格提示 */}
                <div className="p-3 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border border-rose-100">
                  <div className="flex items-center gap-3 text-xs">
                    <Badge variant="outline" className="bg-white">
                      语气：{personaStyleConfig.tone}
                    </Badge>
                    <Badge variant="outline" className="bg-white">
                      表情：{personaStyleConfig.emojiDensity}
                    </Badge>
                    <Badge variant="outline" className="bg-white">
                      标题：{personaStyleConfig.titleStyle}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 生成按钮 */}
            <div className="flex gap-3">
              <Button
                onClick={handleGenerateTitles}
                disabled={isGenerating || (!keywords.trim() && !selectedHotTopic)}
                className="flex-1 h-12 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    生成标题
                  </>
                )}
              </Button>
              {showTitlePreview && generatedTitles.length > 0 && (
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || selectedTitleIndex === null}
                  className="flex-1 h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  <Rocket className="w-4 h-4 mr-2" />
                  生成内容
                </Button>
              )}
            </div>

            {/* 标题预览 */}
            {showTitlePreview && generatedTitles.length > 0 && (
              <Card className="mt-4 border border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm font-bold text-gray-800">
                    选择标题
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {generatedTitles.map((title, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedTitleIndex(index)}
                        className={`w-full p-3 rounded-xl text-left transition-all ${
                          selectedTitleIndex === index
                            ? 'bg-white border-2 border-rose-500 shadow-md'
                            : 'bg-white/50 hover:bg-white border border-gray-200'
                        }`}
                      >
                        <span className={`inline-block w-5 h-5 rounded-full text-xs font-bold mr-2 text-center leading-5 ${
                          selectedTitleIndex === index
                            ? 'bg-rose-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="text-sm text-gray-700">{title}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 当前步骤提示 */}
            {isGenerating && currentStep && (
              <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-200 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                <span className="text-sm text-blue-600">{currentStep}</span>
              </div>
            )}
          </div>

          {/* 右侧：输出预览 */}
          {viewMode === 'split' && (
            <div className="space-y-4">
              {/* 内容预览 */}
              {content && (
                <Card className="border-0 shadow-lg bg-white/90">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        生成内容
                      </CardTitle>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditing(!isEditing)}
                        >
                          {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleCopyContent}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {isEditing ? (
                      <Textarea
                        value={editableContent}
                        onChange={(e) => {
                          setEditableContent(e.target.value);
                          setUserEdited(true);
                        }}
                        className="min-h-[400px] border-rose-200"
                      />
                    ) : (
                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                          {content}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 标签 */}
              {tags.length > 0 && (
                <Card className="border-0 shadow-lg bg-white/90">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      推荐标签
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="bg-rose-100 text-rose-700">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 配图建议 */}
              {imageUrls.length > 0 && (
                <Card className="border-0 shadow-lg bg-white/90">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      配图建议
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="grid grid-cols-2 gap-2">
                      {imageUrls.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt={`配图${i + 1}`}
                          className="rounded-lg w-full h-32 object-cover"
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 合规检查 */}
              {compliance && !compliance.isCompliant && (
                <Card className="border border-amber-300 bg-amber-50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">合规提醒</p>
                        <ul className="text-xs text-amber-600 mt-1 space-y-1">
                          {compliance.warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 种草力评分 */}
              {engagementScore && (
                <Card className="border-0 shadow-lg bg-gradient-to-br from-rose-50 to-pink-50">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-500" />
                      种草力评分
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl font-bold text-rose-500">
                        {engagementScore.score.toFixed(1)}
                        <span className="text-sm text-gray-400">/10</span>
                      </div>
                      <div className="flex-1 space-y-1">
                        {engagementScore.reasons.map((reason, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* 整合视图 */}
        {viewMode === 'integrated' && content && (
          <Card className="mt-6 max-w-2xl mx-auto border-0 shadow-lg bg-white/90">
            <CardContent className="p-6">
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                  {content}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex flex-wrap gap-2 mb-4">
                  {tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="bg-rose-100 text-rose-700">
                      #{tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCopyContent}>
                    <Copy className="w-4 h-4 mr-1" />
                    复制内容
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

// 历史记录类型
interface HistoryRecord {
  id: number;
  content: string;
  created_at: string;
}
