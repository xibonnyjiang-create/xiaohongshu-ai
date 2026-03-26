'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
  Sparkles, RefreshCw, Copy, Download, ImageIcon, 
  FileText, Video, TrendingUp, Loader2, Heart, Hash,
  AlertTriangle, Check, ChevronDown, ChevronUp, Settings2,
  Flame, X, Edit3, Save, Wand2, Lock, Unlock, History,
  Trash2, FileEdit, Lightbulb, Target, Layers, Star
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  TopicType, UserTag, ContentType, VideoDuration, VideoStyle,
  TitleStyle, HotTopicTimeRange, AdditionalRequirement, PersonaType,
  TitleCandidate, HotTopic, HistoryRecord, EngagementScore,
  AnalysisTarget, ContentDepth, FocusDirection, ContentSubType
} from '@/lib/types';
import { 
  TOPIC_TYPE_OPTIONS, USER_TAG_OPTIONS, CONTENT_TYPE_OPTIONS,
  HOT_TOPIC_TIME_RANGE_OPTIONS, TITLE_STYLE_OPTIONS, PERSONA_OPTIONS,
  ADDITIONAL_REQUIREMENT_OPTIONS, VIDEO_DURATION_OPTIONS, VIDEO_STYLE_OPTIONS,
  USER_TAG_TOPIC_COMPATIBILITY, SHOW_HOT_TOPICS_TOPIC, TOPIC_RECOMMENDATIONS,
  ANALYSIS_TARGET_OPTIONS, CONTENT_DEPTH_OPTIONS, FOCUS_DIRECTION_OPTIONS,
  CONTENT_SUBTYPE_OPTIONS
} from '@/lib/constants';

export default function Home() {
  // ==================== 基础参数 ====================
  const [topicType, setTopicType] = useState<TopicType>('market_hot');
  const [userTag, setUserTag] = useState<UserTag>('newbie');
  const [contentType, setContentType] = useState<ContentType>('article');
  const [keywords, setKeywords] = useState('');

  // ==================== 动态配置 ====================
  const [analysisTarget, setAnalysisTarget] = useState<AnalysisTarget>('market_event');
  const [analysisTargetInput, setAnalysisTargetInput] = useState('');
  const [contentDepth, setContentDepth] = useState<ContentDepth>('logical');
  const [focusDirections, setFocusDirections] = useState<FocusDirection[]>(['why_happen', 'what_impact']);
  const [contentSubType, setContentSubType] = useState<ContentSubType>('beginner_start');
  const [platformCompare, setPlatformCompare] = useState('');
  const [includeExample, setIncludeExample] = useState(true);
  const [includeResearch, setIncludeResearch] = useState(false);

  // ==================== 内容设置 ====================
  const [videoDuration, setVideoDuration] = useState<VideoDuration>('60s');
  const [videoStyle, setVideoStyle] = useState<VideoStyle>('popular_science');
  const [enableImageSuggestion, setEnableImageSuggestion] = useState(true);

  // ==================== 高级参数 ====================
  const [titleStyles, setTitleStyles] = useState<TitleStyle[]>([]);
  const [customTitleStyle, setCustomTitleStyle] = useState('');
  const [personaType, setPersonaType] = useState<PersonaType>('veteran_trader');
  const [customPersona, setCustomPersona] = useState('');
  const [additionalRequirements, setAdditionalRequirements] = useState<AdditionalRequirement[]>([]);
  const [customRequirement, setCustomRequirement] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ==================== 热榜数据 ====================
  const [hotTopics, setHotTopics] = useState<HotTopic[]>([]);
  const [hotTopicsLoading, setHotTopicsLoading] = useState(false);
  const [selectedHotTopic, setSelectedHotTopic] = useState<HotTopic | null>(null);
  const [hotTopicTimeRange, setHotTopicTimeRange] = useState<HotTopicTimeRange>('24h');

  // ==================== 历史记录 ====================
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // ==================== UI状态 ====================
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [viewMode, setViewMode] = useState<'integrated' | 'split'>('integrated');
  const [isEditing, setIsEditing] = useState(false);
  const [lockedModules, setLockedModules] = useState<Set<'title' | 'content' | 'tags'>>(new Set());

  // ==================== 输出状态 ====================
  const [titles, setTitles] = useState<TitleCandidate[]>([]);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState(0);
  const [content, setContent] = useState('');
  const [editableContent, setEditableContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [compliance, setCompliance] = useState<{ isCompliant: boolean; warnings: string[] }>({ isCompliant: true, warnings: [] });
  const [engagementScore, setEngagementScore] = useState<EngagementScore | null>(null);

  // ==================== 计算属性 ====================
  const isVideo = contentType === 'video_script';
  const showHotTopics = SHOW_HOT_TOPICS_TOPIC.includes(topicType);
  const topicRecommendations = TOPIC_RECOMMENDATIONS[topicType];
  const compatibleTopics = USER_TAG_TOPIC_COMPATIBILITY[userTag];

  // ==================== 初始化 ====================
  useEffect(() => {
    if (showHotTopics) {
      loadHotTopics();
    }
  }, [showHotTopics, hotTopicTimeRange]);

  useEffect(() => {
    const saved = localStorage.getItem('contentHistory');
    if (saved) {
      setHistoryRecords(JSON.parse(saved));
    }
  }, []);

  // 切换用户标签时，检查选题兼容性
  useEffect(() => {
    if (!compatibleTopics.includes(topicType)) {
      setTopicType(compatibleTopics[0]);
    }
  }, [userTag, compatibleTopics, topicType]);

  // ==================== 加载热榜 ====================
  const loadHotTopics = useCallback(async () => {
    setHotTopicsLoading(true);
    try {
      const response = await fetch(`/api/hot-topics?timeRange=${hotTopicTimeRange}`);
      const data = await response.json();
      setHotTopics(data.topics || []);
    } catch (error) {
      console.error('Load hot topics error:', error);
    } finally {
      setHotTopicsLoading(false);
    }
  }, [hotTopicTimeRange]);

  // ==================== 选择热点/推荐 ====================
  const handleSelectItem = (title: string) => {
    setKeywords(title);
  };

  // ==================== 切换模块锁定 ====================
  const toggleLock = (module: 'title' | 'content' | 'tags') => {
    setLockedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(module)) {
        newSet.delete(module);
      } else {
        newSet.add(module);
      }
      return newSet;
    });
  };

  // ==================== 生成内容 ====================
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setContent('');
    setTitles([]);
    setTags([]);
    setImageUrls([]);
    setEngagementScore(null);
    setCurrentStep('准备中...');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicType, userTag, contentType, keywords,
          analysisTarget, analysisTargetInput, contentDepth, focusDirections,
          contentSubType, platformCompare, includeExample, includeResearch,
          videoDuration, videoStyle, enableImageSuggestion,
          titleStyles, customTitleStyle, personaType, customPersona,
          additionalRequirements, customRequirement,
          hotTopicInfo: selectedHotTopic ? `${selectedHotTopic.title}\n${selectedHotTopic.snippet}` : undefined,
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
                    if (!lockedModules.has('title')) setTitles(data.data);
                    break;
                  case 'content':
                    if (!lockedModules.has('content')) {
                      accumulatedContent += data.data;
                      setContent(accumulatedContent);
                      setEditableContent(accumulatedContent);
                    }
                    break;
                  case 'tags':
                    if (!lockedModules.has('tags')) setTags(data.data);
                    break;
                  case 'images':
                    setImageUrls(data.data);
                    break;
                  case 'compliance':
                    setCompliance(data.data);
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
  }, [topicType, userTag, contentType, keywords, analysisTarget, analysisTargetInput, 
      contentDepth, focusDirections, contentSubType, platformCompare, includeExample, 
      includeResearch, videoDuration, videoStyle, enableImageSuggestion, titleStyles, 
      customTitleStyle, personaType, customPersona, additionalRequirements, customRequirement, 
      selectedHotTopic, lockedModules]);

  // ==================== 保存到历史 ====================
  const handleSave = () => {
    const record: HistoryRecord = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      title: titles[selectedTitleIndex]?.title || '',
      content: editableContent,
      tags,
      imageUrl: imageUrls[selectedImageIndex],
      imageUrls,
      engagementScore: engagementScore || undefined,
      isFavorite: false,
    };
    
    const newRecords = [record, ...historyRecords].slice(0, 50);
    setHistoryRecords(newRecords);
    localStorage.setItem('contentHistory', JSON.stringify(newRecords));
    toast.success('已保存到历史记录');
  };

  // ==================== 复制与导出 ====================
  const handleCopyForXHS = () => {
    const selectedTitle = titles[selectedTitleIndex]?.title || '';
    const text = `${selectedTitle}\n\n${editableContent}\n\n${tags.map(t => '#' + t).join(' ')}`;
    navigator.clipboard.writeText(text);
    toast.success('已复制，可直接粘贴到小红书');
  };

  const handleExport = () => {
    const selectedTitle = titles[selectedTitleIndex]?.title || '';
    const text = `【标题】${selectedTitle}\n\n【正文】\n${editableContent}\n\n【标签】\n${tags.map(t => '#' + t).join(' ')}\n\n${engagementScore ? `【种草力评分】${engagementScore.score}/10分` : ''}`;
    
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `小红书内容_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('已导出');
  };

  // ==================== 历史记录操作 ====================
  const handleLoadHistory = (record: HistoryRecord) => {
    setTitles([{ title: record.title, style: 'suspense' }]);
    setSelectedTitleIndex(0);
    setContent(record.content);
    setEditableContent(record.content);
    setTags(record.tags);
    if (record.imageUrls?.length) setImageUrls(record.imageUrls);
    setEngagementScore(record.engagementScore || null);
    setShowHistory(false);
    toast.success('已加载历史记录');
  };

  const handleDeleteHistory = (id: string) => {
    const newRecords = historyRecords.filter(r => r.id !== id);
    setHistoryRecords(newRecords);
    localStorage.setItem('contentHistory', JSON.stringify(newRecords));
    toast.success('已删除');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl shadow-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-rose-600 to-orange-500 bg-clip-text text-transparent">
                小红书AI爆款内容生成器
              </h1>
              <p className="text-gray-500 text-xs">智能生成专业、深度的财经内容</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowHistory(true)} className="gap-2">
            <History className="h-4 w-4" />
            历史记录
            {historyRecords.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{historyRecords.length}</Badge>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-12 gap-5">
          {/* ==================== 左侧：输入区域 ==================== */}
          <div className="col-span-5 space-y-4">
            
            {/* 基础设置 */}
            <Card className="border-0 shadow-lg bg-white/90">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold text-gray-800">基础设置</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4 space-y-4">
                
                {/* 目标用户 - 分段控件 */}
                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block">目标用户</Label>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 rounded-xl">
                    {USER_TAG_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setUserTag(opt.value)}
                        className={`py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                          userTag === opt.value
                            ? 'bg-white text-rose-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 选题类型 - 分段控件 */}
                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block">选题类型</Label>
                  <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-xl">
                    {TOPIC_TYPE_OPTIONS.map(opt => {
                      const isCompatible = compatibleTopics.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          onClick={() => isCompatible && setTopicType(opt.value)}
                          className={`py-2 px-1 rounded-lg text-xs font-medium transition-all ${
                            topicType === opt.value
                              ? 'bg-white text-rose-600 shadow-sm'
                              : isCompatible
                                ? 'text-gray-600 hover:text-gray-900'
                                : 'text-gray-400 cursor-not-allowed opacity-50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {TOPIC_TYPE_OPTIONS.find(o => o.value === topicType)?.description}
                  </p>
                </div>

                {/* 内容形式 */}
                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block">内容形式</Label>
                  <div className="flex gap-2">
                    {CONTENT_TYPE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setContentType(opt.value)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                          contentType === opt.value
                            ? 'bg-rose-500 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <span>{opt.icon}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 关键词 */}
                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block">关键词</Label>
                  <Input
                    placeholder="输入关键词或从下方选择..."
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    className="h-9"
                  />
                </div>
              </CardContent>
            </Card>

            {/* ==================== 热榜/推荐区域 ==================== */}
            {showHotTopics && (
              <Card className="border-0 shadow-lg bg-white/90">
                <CardHeader className="pb-2 pt-3 px-5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                      <Flame className="h-4 w-4 text-orange-500" />
                      {hotTopicTimeRange === '24h' ? '今日热点' : hotTopicTimeRange === '7d' ? '近7天热点' : '近30天热点'}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Select value={hotTopicTimeRange} onValueChange={(v) => setHotTopicTimeRange(v as HotTopicTimeRange)}>
                        <SelectTrigger className="h-7 w-20 text-xs border-0 bg-gray-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HOT_TOPIC_TIME_RANGE_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={loadHotTopics} disabled={hotTopicsLoading}>
                        <RefreshCw className={`h-3.5 w-3.5 ${hotTopicsLoading ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-3 pt-0">
                  {hotTopicsLoading && hotTopics.length === 0 ? (
                    <div className="flex items-center justify-center py-4 text-gray-400 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      加载中...
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {hotTopics.slice(0, 5).map((topic) => (
                        <button
                          key={topic.id}
                          onClick={() => handleSelectItem(topic.title)}
                          className={`w-full p-2 rounded-lg text-left transition-all ${
                            keywords === topic.title
                              ? 'bg-orange-50 border border-orange-200'
                              : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 text-white text-[10px] flex items-center justify-center font-medium flex-shrink-0">
                              {topic.id}
                            </span>
                            <p className="text-xs text-gray-700 line-clamp-1 flex-1">{topic.title}</p>
                            <span className="text-[10px] text-gray-400 flex-shrink-0">{topic.source}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 推荐主题（非市场热点时显示） */}
            {!showHotTopics && topicRecommendations.length > 0 && (
              <Card className="border-0 shadow-lg bg-white/90">
                <CardHeader className="pb-2 pt-3 px-5">
                  <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    推荐主题
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-3 pt-0">
                  <div className="space-y-1.5">
                    {topicRecommendations.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelectItem(item.title)}
                        className={`w-full p-2 rounded-lg text-left transition-all ${
                          keywords === item.title
                            ? 'bg-amber-50 border border-amber-200'
                            : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-700">{item.title}</p>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{item.category}</Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ==================== 动态配置区域 ==================== */}
            {(topicType === 'market_hot' || topicType === 'professional_analysis') && (
              <Card className="border-0 shadow-lg bg-white/90">
                <CardHeader className="pb-2 pt-3 px-5">
                  <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                    <Target className="h-4 w-4 text-rose-500" />
                    分析配置
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4 space-y-3">
                  
                  {/* 分析对象 */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-1.5 block">分析对象</Label>
                    <div className="flex gap-2">
                      <Select value={analysisTarget} onValueChange={(v) => setAnalysisTarget(v as AnalysisTarget)}>
                        <SelectTrigger className="h-8 flex-1 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ANALYSIS_TARGET_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {(analysisTarget === 'asset' || analysisTarget === 'custom') && (
                        <Input
                          placeholder={ANALYSIS_TARGET_OPTIONS.find(o => o.value === analysisTarget)?.placeholder}
                          value={analysisTargetInput}
                          onChange={(e) => setAnalysisTargetInput(e.target.value)}
                          className="h-8 w-32 text-xs"
                        />
                      )}
                    </div>
                  </div>

                  {/* 内容深度 */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-1.5 block">内容深度</Label>
                    <div className="flex gap-1.5">
                      {CONTENT_DEPTH_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setContentDepth(opt.value)}
                          className={`flex-1 py-1.5 rounded-lg text-xs transition-all ${
                            contentDepth === opt.value
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 重点关注 */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-1.5 block">重点关注</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {FOCUS_DIRECTION_OPTIONS.map(opt => (
                        <label
                          key={opt.value}
                          className={`flex items-center gap-1.5 p-2 rounded-lg cursor-pointer transition-all text-xs ${
                            focusDirections.includes(opt.value)
                              ? 'bg-rose-50 border border-rose-200'
                              : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                          }`}
                        >
                          <Checkbox
                            checked={focusDirections.includes(opt.value)}
                            onCheckedChange={(checked) => {
                              setFocusDirections(prev =>
                                checked ? [...prev, opt.value] : prev.filter(v => v !== opt.value)
                              );
                            }}
                            className="h-3.5 w-3.5"
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {(topicType === 'beginner_guide' || topicType === 'advanced_invest') && (
              <Card className="border-0 shadow-lg bg-white/90">
                <CardHeader className="pb-2 pt-3 px-5">
                  <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    内容配置
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4 space-y-3">
                  
                  {/* 内容子类型 */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-1.5 block">内容子类型</Label>
                    <div className="flex gap-1.5">
                      {CONTENT_SUBTYPE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setContentSubType(opt.value)}
                          className={`flex-1 py-2 rounded-lg text-xs transition-all ${
                            contentSubType === opt.value
                              ? 'bg-amber-100 text-amber-700 border border-amber-200'
                              : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
                          }`}
                        >
                          <div className="font-medium">{opt.label}</div>
                          <div className="text-[10px] opacity-70">{opt.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 平台对比输入 */}
                  {contentSubType === 'platform_compare' && (
                    <div>
                      <Label className="text-xs text-gray-500 mb-1.5 block">对比平台</Label>
                      <Input
                        placeholder="如：华泰 vs 中信"
                        value={platformCompare}
                        onChange={(e) => setPlatformCompare(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  )}

                  {/* 附加选项 */}
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700">
                      <Checkbox
                        checked={includeExample}
                        onCheckedChange={(checked) => setIncludeExample(checked as boolean)}
                        className="h-3.5 w-3.5"
                      />
                      举例说明
                    </label>
                    {topicType === 'advanced_invest' && (
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700">
                        <Checkbox
                          checked={includeResearch}
                          onCheckedChange={(checked) => setIncludeResearch(checked as boolean)}
                          className="h-3.5 w-3.5"
                        />
                        引用研报
                      </label>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ==================== 内容设置 ==================== */}
            <Card className="border-0 shadow-lg bg-white/90">
              <CardHeader className="pb-2 pt-3 px-5">
                <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-rose-500" />
                  内容设置
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4 space-y-3">
                
                {isVideo ? (
                  <>
                    {/* 视频时长 */}
                    <div>
                      <Label className="text-xs text-gray-500 mb-1.5 block">视频时长</Label>
                      <div className="flex gap-1.5">
                        {VIDEO_DURATION_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setVideoDuration(opt.value)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              videoDuration === opt.value
                                ? 'bg-rose-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 视频风格 */}
                    <div>
                      <Label className="text-xs text-gray-500 mb-1.5 block">视频风格</Label>
                      <Select value={videoStyle} onValueChange={(v) => setVideoStyle(v as VideoStyle)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VIDEO_STYLE_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 配图建议开关 */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs font-medium text-gray-700">参考配图</Label>
                        <p className="text-[10px] text-gray-400">生成内容时附带配图</p>
                      </div>
                      <Switch
                        checked={enableImageSuggestion}
                        onCheckedChange={setEnableImageSuggestion}
                      />
                    </div>
                  </>
                ) : (
                  /* 配图建议开关 */
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-medium text-gray-700">配图建议</Label>
                      <p className="text-[10px] text-gray-400">生成内容时附带封面/配图</p>
                    </div>
                    <Switch
                      checked={enableImageSuggestion}
                      onCheckedChange={setEnableImageSuggestion}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ==================== 高级设置 ==================== */}
            <Card className="border-0 shadow-lg bg-white/90">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full px-5 py-3 flex items-center justify-between"
              >
                <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <Settings2 className="h-4 w-4 text-gray-500" />
                  高级设置
                </CardTitle>
                {showAdvanced ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
              </button>
              
              {showAdvanced && (
                <CardContent className="px-5 pb-4 space-y-3">
                  
                  {/* 博主人设 */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-1.5 block">博主人设</Label>
                    <Select value={personaType} onValueChange={(v) => setPersonaType(v as PersonaType)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PERSONA_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {personaType === 'custom' && (
                      <Input
                        placeholder="输入自定义人设描述..."
                        value={customPersona}
                        onChange={(e) => setCustomPersona(e.target.value)}
                        className="h-8 mt-2 text-xs"
                      />
                    )}
                  </div>

                  {/* 标题风格 */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-1.5 block">标题风格</Label>
                    <div className="flex flex-wrap gap-1">
                      {TITLE_STYLE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setTitleStyles(prev =>
                              prev.includes(opt.value)
                                ? prev.filter(s => s !== opt.value)
                                : [...prev, opt.value]
                            );
                          }}
                          className={`px-2.5 py-1 rounded-full text-xs transition-all ${
                            titleStyles.includes(opt.value)
                              ? 'bg-amber-100 text-amber-700 border border-amber-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {titleStyles.includes('custom') && (
                      <Input
                        placeholder="输入自定义风格..."
                        value={customTitleStyle}
                        onChange={(e) => setCustomTitleStyle(e.target.value)}
                        className="h-8 mt-2 text-xs"
                      />
                    )}
                  </div>

                  {/* 补充要求 */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-1.5 block">补充要求</Label>
                    <div className="flex flex-wrap gap-1">
                      {ADDITIONAL_REQUIREMENT_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setAdditionalRequirements(prev =>
                              prev.includes(opt.value)
                                ? prev.filter(r => r !== opt.value)
                                : [...prev, opt.value]
                            );
                          }}
                          className={`px-2.5 py-1 rounded-full text-xs transition-all ${
                            additionalRequirements.includes(opt.value)
                              ? 'bg-violet-100 text-violet-700 border border-violet-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {additionalRequirements.includes('custom') && (
                      <Input
                        placeholder="输入自定义要求..."
                        value={customRequirement}
                        onChange={(e) => setCustomRequirement(e.target.value)}
                        className="h-8 mt-2 text-xs"
                      />
                    )}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* 生成按钮 */}
            <Button
              className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 shadow-lg rounded-xl"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {currentStep || '生成中...'}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  生成内容
                </>
              )}
            </Button>
          </div>

          {/* ==================== 右侧：输出区域 ==================== */}
          <div className="col-span-7">
            <Card className="border-0 shadow-lg bg-white/90 sticky top-4">
              <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-gray-800">生成结果</CardTitle>
                  {titles.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex bg-gray-100 rounded-lg p-0.5">
                        <button
                          onClick={() => setViewMode('integrated')}
                          className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                            viewMode === 'integrated' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                          }`}
                        >
                          整合视图
                        </button>
                        <button
                          onClick={() => setViewMode('split')}
                          className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                            viewMode === 'split' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                          }`}
                        >
                          拆分视图
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                {titles.length === 0 && !content ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <FileText className="h-10 w-10 mb-2" />
                    <p className="text-sm">点击"生成内容"开始创作</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    
                    {/* 整合视图 */}
                    {viewMode === 'integrated' && (
                      <div className="space-y-3">
                        {/* 标题 */}
                        {titles.length > 0 && (
                          <div className="p-3 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border border-rose-100">
                            <div className="text-base font-semibold text-gray-900">
                              {titles[selectedTitleIndex]?.title}
                            </div>
                            {titles.length > 1 && (
                              <div className="flex gap-1.5 mt-2">
                                {titles.map((t, i) => (
                                  <button
                                    key={i}
                                    onClick={() => setSelectedTitleIndex(i)}
                                    className={`w-2 h-2 rounded-full transition-all ${
                                      selectedTitleIndex === i ? 'bg-rose-500 w-4' : 'bg-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 正文 */}
                        {editableContent && (
                          <div className="p-3 bg-gray-50 rounded-xl">
                            {isEditing ? (
                              <Textarea
                                value={editableContent}
                                onChange={(e) => setEditableContent(e.target.value)}
                                className="min-h-[180px] resize-none border-0 bg-transparent p-0 text-sm"
                              />
                            ) : (
                              <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                                {editableContent}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 标签 */}
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {tags.map((tag, i) => (
                              <Badge key={i} className="bg-rose-100 text-rose-700 border-0 text-xs">#{tag}</Badge>
                            ))}
                          </div>
                        )}

                        {/* 配图 */}
                        {imageUrls.length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            {imageUrls.map((url, i) => (
                              <button
                                key={i}
                                onClick={() => setSelectedImageIndex(i)}
                                className={`relative aspect-square rounded-xl overflow-hidden ${
                                  selectedImageIndex === i ? 'ring-2 ring-rose-500 ring-offset-2' : ''
                                }`}
                              >
                                <img src={url} alt="" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        )}

                        {/* 种草力评分 */}
                        {engagementScore && (
                          <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-700">种草力评分</span>
                              <span className="text-xl font-bold text-amber-600">{engagementScore.score}/10</span>
                            </div>
                            {engagementScore.reasons.length > 0 && (
                              <div className="text-[10px] text-gray-600">
                                {engagementScore.reasons.join('；')}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 合规提醒 */}
                        {!compliance.isCompliant && (
                          <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                            <div className="flex items-center gap-1.5 text-amber-700 font-medium mb-1 text-xs">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              合规提醒
                            </div>
                            {compliance.warnings.map((w, i) => (
                              <p key={i} className="text-xs text-amber-600">{w}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 拆分视图 */}
                    {viewMode === 'split' && (
                      <div className="space-y-3">
                        {/* 标题模块 */}
                        {titles.length > 0 && (
                          <div className="p-3 border rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                <Sparkles className="h-3 w-3 text-rose-500" />
                                标题候选
                              </Label>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleLock('title')}>
                                  {lockedModules.has('title') ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleGenerate}>
                                  <RefreshCw className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              {titles.map((t, i) => (
                                <button
                                  key={i}
                                  onClick={() => setSelectedTitleIndex(i)}
                                  className={`w-full p-2 rounded-lg text-left text-xs ${
                                    selectedTitleIndex === i ? 'bg-rose-50 border border-rose-200' : 'bg-gray-50'
                                  }`}
                                >
                                  {t.title}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 正文模块 */}
                        {content && (
                          <div className="p-3 border rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                <FileText className="h-3 w-3 text-rose-500" />
                                正文内容
                              </Label>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setIsEditing(!isEditing)}>
                                  <Edit3 className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleLock('content')}>
                                  {lockedModules.has('content') ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleGenerate}>
                                  <RefreshCw className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            {isEditing ? (
                              <Textarea
                                value={editableContent}
                                onChange={(e) => setEditableContent(e.target.value)}
                                className="min-h-[120px] resize-none text-xs"
                              />
                            ) : (
                              <div className="p-2 bg-gray-50 rounded-lg min-h-[80px] whitespace-pre-wrap text-xs">
                                {editableContent}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 标签模块 */}
                        {tags.length > 0 && (
                          <div className="p-3 border rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                <Hash className="h-3 w-3 text-rose-500" />
                                话题标签
                              </Label>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleLock('tags')}>
                                  {lockedModules.has('tags') ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleGenerate}>
                                  <RefreshCw className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {tags.map((tag, i) => (
                                <Badge key={i} className="bg-rose-100 text-rose-700 border-0 text-xs">#{tag}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 操作工具栏 */}
                    <div className="pt-3 border-t">
                      <div className="flex flex-wrap gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setIsEditing(!isEditing)}>
                          <Edit3 className="h-3 w-3 mr-1" />
                          编辑
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleSave}>
                          <Save className="h-3 w-3 mr-1" />
                          保存
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleExport}>
                          <Download className="h-3 w-3 mr-1" />
                          导出
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          <Wand2 className="h-3 w-3 mr-1" />
                          AI优化
                        </Button>
                        <Button size="sm" className="h-7 text-xs bg-rose-500 hover:bg-rose-600" onClick={handleCopyForXHS}>
                          <Copy className="h-3 w-3 mr-1" />
                          一键复制到小红书
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 底部 */}
        <div className="text-center mt-6 text-gray-400 text-xs">
          Made with <Heart className="h-3 w-3 inline text-rose-500 fill-rose-500" /> by AI
        </div>
      </div>

      {/* 历史记录弹窗 */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[70vh] overflow-hidden bg-white">
            <CardHeader className="flex flex-row items-center justify-between py-3 px-5">
              <CardTitle className="text-sm">历史记录</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowHistory(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[50vh]">
                {historyRecords.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">暂无历史记录</div>
                ) : (
                  <div className="divide-y">
                    {historyRecords.map((record) => (
                      <div key={record.id} className="p-3 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 cursor-pointer" onClick={() => handleLoadHistory(record)}>
                            <div className="font-medium text-gray-900 text-sm line-clamp-1">{record.title || '无标题'}</div>
                            <div className="text-xs text-gray-500 mt-1 line-clamp-2">{record.content}</div>
                            <div className="text-[10px] text-gray-400 mt-1.5">
                              {new Date(record.createdAt).toLocaleString('zh-CN')}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-3">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleLoadHistory(record)}>
                              <FileEdit className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeleteHistory(record.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
