'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Sparkles, Loader2, Copy, Heart, Check, AlertTriangle,
  Edit3, Save, History, Rocket, Tag, WandSparkles,
  Flame, X, TrendingUp, Clock, RefreshCw, FileText, ImageIcon, Video
} from 'lucide-react';
import { toast } from 'sonner';
import {
  TopicType, TitleCandidate, HotTopic, EngagementScore, OutputFormat, VideoDuration
} from '@/lib/types';
import {
  SCENE_OPTIONS, PERSONA_OPTIONS, PERSONA_STYLE_CONFIG,
  KEYWORD_RECOMMENDATIONS, TOPIC_RECOMMENDATIONS, SHOW_HOT_TOPICS_TOPIC,
  OUTPUT_FORMAT_OPTIONS, VIDEO_DURATION_OPTIONS, LIFE_STYLE_KEYWORDS, WEIXIN_SECURITY_MAPPING
} from '@/lib/constants';

export default function Home() {
  // ==================== 场景选择 ====================
  const [topicType, setTopicType] = useState<TopicType>('market_hot');
  const [keywords, setKeywords] = useState('');
  const [deepAnalysis, setDeepAnalysis] = useState(false);

  // ==================== 输出形式选择 ====================
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('image_text');
  const [videoDuration, setVideoDuration] = useState<VideoDuration>('60s');

  // ==================== 人设选择 ====================
  const [personaType, setPersonaType] = useState<string>('hardcore_uncle');
  const [customPersona, setCustomPersona] = useState('');

  // ==================== 热榜数据 ====================
  const [hotTopics, setHotTopics] = useState<HotTopic[]>([]);
  const [hotTopicsLoading, setHotTopicsLoading] = useState(false);
  const [selectedHotTopic, setSelectedHotTopic] = useState<HotTopic | null>(null);
  const [hotTop3Tags, setHotTop3Tags] = useState<string[]>([]);
  const [hotCategory, setHotCategory] = useState<string>('finance');
  const [hotUpdateTime, setHotUpdateTime] = useState<string>('');

  // 热点板块配置
  const HOT_CATEGORIES = [
    { id: 'finance', name: '财经热搜', icon: '📈', sensitive: false },
    { id: 'tech', name: '科技前沿', icon: '🚀', sensitive: false },
    { id: 'crypto', name: '数字货币', icon: '₿', sensitive: true },
    { id: 'global', name: '环球财经', icon: '🌍', sensitive: false },
  ];

  // ==================== 生成状态 ====================
  const [step, setStep] = useState<'input' | 'titles' | 'content'>('input');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [viewMode, setViewMode] = useState<'integrated' | 'split'>('split');
  const [isEditing, setIsEditing] = useState(false);
  const [userEdited, setUserEdited] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  // ==================== 输出状态 ====================
  const [generatedTitles, setGeneratedTitles] = useState<TitleCandidate[]>([]);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState<number | null>(null);
  const [content, setContent] = useState('');
  const [editableContent, setEditableContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoScript, setVideoScript] = useState<{ hook: string; segments: { visual: string; voiceover: string; duration: string }[]; cta: string } | null>(null);
  const [compliance, setCompliance] = useState<{ isCompliant: boolean; warnings: string[]; fixed?: boolean }>({ isCompliant: true, warnings: [] });
  const [engagementScore, setEngagementScore] = useState<EngagementScore | null>(null);

  // ==================== 计算属性 ====================
  const showHotTopics = SHOW_HOT_TOPICS_TOPIC.includes(topicType);
  const keywordsByScene = KEYWORD_RECOMMENDATIONS[topicType];
  const topicRecommendations = TOPIC_RECOMMENDATIONS[topicType];
  const personaStyleConfig = PERSONA_STYLE_CONFIG[personaType as keyof typeof PERSONA_STYLE_CONFIG] || PERSONA_STYLE_CONFIG.custom;
  const weixinMapping = WEIXIN_SECURITY_MAPPING[topicType] || [];

  // ==================== 加载热搜 ====================
  const loadHotTopics = useCallback(async () => {
    setHotTopicsLoading(true);
    try {
      const res = await fetch(`/api/hot-topics?category=${hotCategory}`);
      if (res.ok) {
        const data = await res.json();
        setHotTopics(data.topics || []);
        setHotUpdateTime(data.updateTime || '');
        if (data.top3Tags) {
          setHotTop3Tags(data.top3Tags);
        }
      }
    } catch (e) {
      console.log('热搜加载失败');
    } finally {
      setHotTopicsLoading(false);
    }
  }, [hotCategory]);

  useEffect(() => {
    if (showHotTopics && topicType === 'market_hot') {
      loadHotTopics();
    }
  }, [showHotTopics, topicType, hotCategory, loadHotTopics]);

  // ==================== 标题生成 ====================
  const handleGenerateTitles = useCallback(async () => {
    if (!keywords.trim() && !selectedHotTopic && topicType !== 'beginner_guide') {
      toast.error('请输入关键词或选择热点');
      return;
    }

    setIsGenerating(true);
    setCurrentStep('正在生成标题...');
    setStep('titles');

    try {
      const response = await fetch('/api/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicType,
          keywords: keywords || selectedHotTopic?.title,
          personaType,
          hotTopicInfo: selectedHotTopic ? `${selectedHotTopic.title}\n${selectedHotTopic.snippet}` : undefined,
          hotTop3Tags,
        }),
      });

      if (!response.ok) throw new Error('标题生成失败');

      const data = await response.json();
      if (data.titles && data.titles.length > 0) {
        setGeneratedTitles(data.titles);
        setSelectedTitleIndex(0);
        toast.success('标题生成完成！请选择标题');
      } else {
        toast.error('未生成标题，请重试');
      }
    } catch (error) {
      toast.error('标题生成失败');
    } finally {
      setIsGenerating(false);
      setCurrentStep('');
    }
  }, [topicType, keywords, personaType, selectedHotTopic, hotTop3Tags]);

  // ==================== 内容生成 ====================
  const handleGenerateContent = useCallback(async () => {
    if (selectedTitleIndex === null || !generatedTitles[selectedTitleIndex]) {
      toast.error('请先选择一个标题');
      return;
    }

    setIsGenerating(true);
    setCurrentStep('正在生成内容...');
    setStep('content');
    setContent('');
    setEditableContent('');
    setVideoScript(null);

    const selectedTitle = generatedTitles[selectedTitleIndex].title;

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicType,
          keywords,
          deepAnalysis,
          outputFormat,
          videoDuration,
          personaType,
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
                  case 'content':
                    accumulatedContent += data.data;
                    setContent(accumulatedContent);
                    setEditableContent(accumulatedContent);
                    break;
                  case 'video_script':
                    setVideoScript(data.data);
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

  // ==================== 返回修改标题 ====================
  const handleBackToTitles = () => {
    setStep('titles');
    setContent('');
    setEditableContent('');
    setTags([]);
    setImageUrls([]);
    setCompliance({ isCompliant: true, warnings: [] });
    setEngagementScore(null);
  };

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
            
            {/* Step 1: 场景选择 */}
            {step === 'input' && (
              <>
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
                          onClick={() => {
                            setTopicType(option.value);
                            setSelectedHotTopic(null);
                          }}
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

                    {/* 输出形式选择 */}
                    <div className="mt-4">
                      <p className="text-xs text-gray-500 mb-2">输出形式</p>
                      <div className="grid grid-cols-2 gap-2">
                        {OUTPUT_FORMAT_OPTIONS.map(option => (
                          <button
                            key={option.value}
                            onClick={() => setOutputFormat(option.value)}
                            className={`p-3 rounded-xl text-left transition-all ${
                              outputFormat === option.value
                                ? 'bg-gradient-to-br from-purple-500 to-indigo-500 text-white shadow-md'
                                : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                            }`}
                          >
                            <span className="text-lg mr-2">{option.emoji}</span>
                            <span className="text-sm font-medium">{option.label}</span>
                            <p className={`text-[10px] mt-1 ${outputFormat === option.value ? 'text-purple-100' : 'text-gray-400'}`}>
                              {option.description}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 视频时长选择 - 仅视频模式显示 */}
                    {outputFormat === 'video' && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-500 mb-2">视频时长</p>
                        <div className="grid grid-cols-4 gap-2">
                          {VIDEO_DURATION_OPTIONS.map(option => (
                            <button
                              key={option.value}
                              onClick={() => setVideoDuration(option.value)}
                              className={`p-2 rounded-lg text-center transition-all ${
                                videoDuration === option.value
                                  ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-md'
                                  : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                              }`}
                            >
                              <span className="text-sm font-medium">{option.label}</span>
                              <p className={`text-[9px] mt-0.5 ${videoDuration === option.value ? 'text-orange-100' : 'text-gray-400'}`}>
                                {option.description}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 字数提示 */}
                    <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                      <p className="text-[10px] text-gray-500">
                        {outputFormat === 'image_text' ? (
                          <>📝 图文内容：标题不超过20字，正文控制在400-500字</>
                        ) : (
                          <>🎬 视频脚本：根据时长自动调整，一般3-5个分镜</>
                        )}
                      </p>
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

                    {/* 微证券功能映射提示 */}
                    {weixinMapping.length > 0 && (
                      <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                        <p className="text-xs font-medium text-gray-700 mb-2">微证券功能植入点</p>
                        <div className="flex flex-wrap gap-2">
                          {weixinMapping.map((item, i) => (
                            <Badge key={i} variant="outline" className="bg-white text-xs">
                              {item.feature}：{item.highlight}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 市场热点 - 热搜榜 */}
                {showHotTopics && topicType === 'market_hot' && (
                  <Card className="mb-4 border-0 shadow-lg bg-white/90">
                    <CardHeader className="pb-3 pt-4 px-5">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                          <Flame className="w-5 h-5 text-orange-500" />
                          实时热搜榜
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={loadHotTopics}
                          disabled={hotTopicsLoading}
                        >
                          <RefreshCw className={`w-4 h-4 ${hotTopicsLoading ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                      {hotUpdateTime && (
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          更新时间：{hotUpdateTime}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="px-5 pb-5">
                      {/* 热搜分类 */}
                      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                        {HOT_CATEGORIES.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => setHotCategory(cat.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                              hotCategory === cat.id
                                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {cat.icon} {cat.name}
                          </button>
                        ))}
                      </div>

                      {/* 热搜列表 */}
                      {hotTopicsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                        </div>
                      ) : hotTopics.length > 0 ? (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {hotTopics.slice(0, 10).map((topic, index) => (
                            <button
                              key={topic.id}
                              onClick={() => {
                                setSelectedHotTopic(topic);
                                setKeywords(topic.title);
                              }}
                              className={`w-full p-3 rounded-xl text-left transition-all ${
                                selectedHotTopic?.id === topic.id
                                  ? 'bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-400'
                                  : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${
                                  index < 3 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'
                                }`}>
                                  {index + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{topic.title}</p>
                                  <p className="text-[10px] text-gray-400 truncate">{topic.snippet}</p>
                                </div>
                                {topic.source && (
                                  <Badge variant="outline" className="text-[10px]">{topic.source}</Badge>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 text-center py-4">暂无热搜数据</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* 小白科普 - 推荐主题 */}
                {topicType === 'beginner_guide' && (
                  <Card className="mb-4 border-0 shadow-lg bg-white/90">
                    <CardHeader className="pb-3 pt-4 px-5">
                      <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                        <WandSparkles className="w-5 h-5 text-green-500" />
                        推荐主题
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 space-y-4">
                      {topicRecommendations.map((rec, index) => (
                        <div key={index} className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">{rec.label}</p>
                          <div className="flex flex-wrap gap-2">
                            {rec.keywords.map((kw, i) => (
                              <button
                                key={i}
                                onClick={() => setKeywords(kw)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                  keywords === kw
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                {kw}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* 生活化种草 - 专属词库 */}
                {topicType === 'life_lifestyle' && (
                  <Card className="mb-4 border-0 shadow-lg bg-gradient-to-br from-green-50 to-teal-50">
                    <CardHeader className="pb-3 pt-4 px-5">
                      <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-green-500" />
                        生活化种草专属词库
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-5">
                      <div className="flex flex-wrap gap-2">
                        {LIFE_STYLE_KEYWORDS.map((kw, i) => (
                          <button
                            key={i}
                            onClick={() => setKeywords(kw)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                              keywords === kw
                                ? 'bg-green-500 text-white'
                                : 'bg-white text-gray-600 hover:bg-green-100 border border-green-200'
                            }`}
                          >
                            {kw}
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

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
                        placeholder={topicType === 'beginner_guide' ? '或输入自定义主题...' : topicType === 'life_lifestyle' ? '选择词库或输入自定义主题...' : '输入内容关键词，如：AI概念、机器人、半导体...'}
                        className="pl-10 border-rose-200 focus:border-rose-400"
                      />
                    </div>

                    {/* 推荐关键词 */}
                    <div className="flex flex-wrap gap-2">
                      {keywordsByScene.map((kw, i) => (
                        <button
                          key={i}
                          onClick={() => setKeywords(kw)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
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
                <Button
                  onClick={handleGenerateTitles}
                  disabled={isGenerating || (!keywords.trim() && !selectedHotTopic && topicType !== 'beginner_guide')}
                  className="w-full h-12 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {currentStep || '生成中...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      生成标题
                    </>
                  )}
                </Button>
              </>
            )}

            {/* Step 2: 标题选择 */}
            {step === 'titles' && (
              <Card className="mb-4 border border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50">
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-gray-800">
                      选择标题
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setStep('input')}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {generatedTitles.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedTitleIndex(index)}
                        className={`w-full p-4 rounded-xl text-left transition-all ${
                          selectedTitleIndex === index
                            ? 'bg-white border-2 border-rose-500 shadow-md'
                            : 'bg-white/50 hover:bg-white border border-gray-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                            selectedTitleIndex === index
                              ? 'bg-rose-500 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {index + 1}
                          </span>
                          <span className="text-sm text-gray-700 flex-1">{item.title}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* 生成内容按钮 */}
                  <Button
                    onClick={handleGenerateContent}
                    disabled={isGenerating || selectedTitleIndex === null}
                    className="w-full mt-4 h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {currentStep || '生成中...'}
                      </>
                    ) : (
                      <>
                        <Rocket className="w-4 h-4 mr-2" />
                        生成内容
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 3: 内容生成中 */}
            {step === 'content' && isGenerating && (
              <Card className="mb-4 border border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-4" />
                    <p className="text-sm text-gray-600">{currentStep || '正在生成...'}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 当前步骤提示 */}
            {isGenerating && currentStep && step === 'content' && (
              <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-200 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                <span className="text-sm text-blue-600">{currentStep}</span>
              </div>
            )}
          </div>

          {/* 右侧：输出预览 */}
          {viewMode === 'split' && (
            <div className="space-y-4">
              {/* 回到标题选择 */}
              {step === 'content' && content && (
                <Button variant="outline" onClick={handleBackToTitles} className="w-full">
                  <X className="w-4 h-4 mr-1" />
                  重新选择标题
                </Button>
              )}

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
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
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

              {/* 视频脚本预览 */}
              {videoScript && (
                <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-indigo-50">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <Video className="w-4 h-4 text-purple-500" />
                      视频脚本
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-4">
                    {/* 黄金3秒钩子 */}
                    <div className="p-3 bg-white rounded-xl border border-purple-200">
                      <p className="text-xs font-medium text-purple-600 mb-1">🎬 黄金3秒钩子</p>
                      <p className="text-sm text-gray-700">{videoScript.hook}</p>
                    </div>

                    {/* 分镜脚本 */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500">分镜脚本</p>
                      {videoScript.segments.map((seg, i) => (
                        <div key={i} className="p-3 bg-white rounded-xl border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="text-xs">镜头 {i + 1}</Badge>
                            <span className="text-xs text-gray-400">{seg.duration}</span>
                          </div>
                          <p className="text-xs text-gray-500 mb-1">📷 画面：{seg.visual}</p>
                          <p className="text-sm text-gray-700">🎤 口播：{seg.voiceover}</p>
                        </div>
                      ))}
                    </div>

                    {/* 行动号召 */}
                    <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl text-white">
                      <p className="text-xs font-medium mb-1">📢 行动号召 (CTA)</p>
                      <p className="text-sm">{videoScript.cta}</p>
                    </div>
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
                        <img key={i} src={url} alt={`配图${i + 1}`} className="rounded-lg w-full h-32 object-cover" />
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
                    <div className="text-4xl font-bold text-rose-500 mb-2">
                      {engagementScore.score.toFixed(1)}
                      <span className="text-sm text-gray-400">/10</span>
                    </div>
                    <div className="space-y-1">
                      {engagementScore.reasons.map((reason, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                          <Check className="w-3 h-3 text-green-500" />
                          {reason}
                        </div>
                      ))}
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
