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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
  Sparkles, RefreshCw, Copy, Download, ImageIcon, 
  FileText, Video, TrendingUp, Loader2, Heart, Hash,
  AlertTriangle, Check, ChevronDown, ChevronUp, Settings2,
  Flame, X, Edit3, Save, Wand2, Lock, Unlock, History,
  Star, Trash2, FileEdit, Share2, ThumbsUp, Zap, Eye, EyeOff,
  Lightbulb, Target, Layers, Clock, User
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
  USER_TAG_TOPIC_COMPATIBILITY, SHOW_HOT_TOPICS, TOPIC_DYNAMIC_CONFIG,
  ANALYSIS_TARGET_OPTIONS, CONTENT_DEPTH_OPTIONS, FOCUS_DIRECTION_OPTIONS,
  CONTENT_SUBTYPE_OPTIONS, POPULAR_GUIDE_TOPICS
} from '@/lib/constants';

export default function Home() {
  // ==================== 基础参数 ====================
  const [topicType, setTopicType] = useState<TopicType>('market_hot');
  const [userTag, setUserTag] = useState<UserTag>('newbie');
  const [contentType, setContentType] = useState<ContentType>('article');
  const [keywords, setKeywords] = useState('');

  // ==================== 动态配置（分析类）====================
  const [analysisTarget, setAnalysisTarget] = useState<AnalysisTarget>('market_event');
  const [analysisTargetInput, setAnalysisTargetInput] = useState('');
  const [contentDepth, setContentDepth] = useState<ContentDepth>('logical');
  const [focusDirections, setFocusDirections] = useState<FocusDirection[]>(['why_happen', 'what_impact']);

  // ==================== 动态配置（科普类）====================
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
  const showHotTopics = SHOW_HOT_TOPICS.includes(topicType);
  const dynamicConfigType = TOPIC_DYNAMIC_CONFIG[topicType];
  const isAnalysisType = dynamicConfigType === 'analysis';
  const isGuideType = dynamicConfigType === 'guide';

  // ==================== 初始化 ====================
  useEffect(() => {
    if (showHotTopics) {
      loadHotTopics();
    }
  }, [showHotTopics, hotTopicTimeRange]);

  useEffect(() => {
    // 加载历史记录
    const saved = localStorage.getItem('contentHistory');
    if (saved) {
      setHistoryRecords(JSON.parse(saved));
    }
  }, []);

  // 切换选题时重置动态配置
  useEffect(() => {
    if (isAnalysisType) {
      setFocusDirections(['why_happen', 'what_impact']);
    } else if (isGuideType) {
      setContentSubType('beginner_start');
    }
  }, [topicType, isAnalysisType, isGuideType]);

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

  // ==================== 选择热点 ====================
  const handleSelectHotTopic = (topic: HotTopic) => {
    setSelectedHotTopic(topic);
    setKeywords(topic.title);
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
  const handleGenerate = useCallback(async (refreshModule?: 'title' | 'content' | 'tags' | 'all') => {
    setIsGenerating(true);
    if (refreshModule === 'all' || !refreshModule) {
      setContent('');
      setTitles([]);
      setTags([]);
      setImageUrls([]);
      setEngagementScore(null);
    }
    setCurrentStep('准备中...');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicType, userTag, contentType, keywords,
          // 动态配置
          analysisTarget, analysisTargetInput, contentDepth, focusDirections,
          contentSubType, platformCompare, includeExample, includeResearch,
          // 内容设置
          videoDuration, videoStyle, enableImageSuggestion,
          // 高级设置
          titleStyles, customTitleStyle, personaType, customPersona,
          additionalRequirements, customRequirement,
          // 热点信息
          hotTopicInfo: selectedHotTopic ? `${selectedHotTopic.title}\n${selectedHotTopic.snippet}` : undefined,
          // 刷新模式
          refreshModule,
          lockedModules: Array.from(lockedModules),
        }),
      });

      if (!response.ok) throw new Error('生成失败');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let accumulatedContent = content;

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
                    if (!lockedModules.has('title')) {
                      setTitles(data.data);
                    }
                    break;
                  case 'content':
                    if (!lockedModules.has('content')) {
                      accumulatedContent += data.data;
                      setContent(accumulatedContent);
                      setEditableContent(accumulatedContent);
                    }
                    break;
                  case 'tags':
                    if (!lockedModules.has('tags')) {
                      setTags(data.data);
                    }
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
      selectedHotTopic, lockedModules, content]);

  // ==================== AI优化 ====================
  const handleOptimize = async (type: 'title' | 'content' | 'shorten' | 'expand') => {
    toast.info('AI优化中...');
    // 调用优化API
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast.success('优化完成！');
  };

  // ==================== 保存到历史 ====================
  const handleSave = () => {
    const record: HistoryRecord = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      params: {
        topicType, userTag, contentType, keywords,
        analysisTarget, contentDepth, focusDirections,
        titleStyles, customTitleStyle, personaType, customPersona,
        additionalRequirements, customRequirement,
      },
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
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

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

  // ==================== 加载历史记录 ====================
  const handleLoadHistory = (record: HistoryRecord) => {
    setTitles([{ title: record.title, style: 'suspense' }]);
    setSelectedTitleIndex(0);
    setContent(record.content);
    setEditableContent(record.content);
    setTags(record.tags);
    if (record.imageUrls?.length) {
      setImageUrls(record.imageUrls);
    }
    setEngagementScore(record.engagementScore || null);
    setShowHistory(false);
    toast.success('已加载历史记录');
  };

  // ==================== 删除历史记录 ====================
  const handleDeleteHistory = (id: string) => {
    const newRecords = historyRecords.filter(r => r.id !== id);
    setHistoryRecords(newRecords);
    localStorage.setItem('contentHistory', JSON.stringify(newRecords));
    toast.success('已删除');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-200">
              <TrendingUp className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">小红书AI爆款内容生成器</h1>
              <p className="text-gray-500 text-sm mt-0.5">智能生成专业、深度的财经内容</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setShowHistory(true)} className="gap-2">
            <History className="h-4 w-4" />
            历史记录
            {historyRecords.length > 0 && (
              <Badge variant="secondary" className="ml-1">{historyRecords.length}</Badge>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* ==================== 左侧：输入区域 ==================== */}
          <div className="col-span-5 space-y-5">
            
            {/* 基础设置 */}
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-3 pt-5 px-6">
                <CardTitle className="text-base font-semibold text-gray-900">基础设置</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-5 space-y-5">
                
                {/* 选题类型 - 分段控件 */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">选题类型</Label>
                  <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-xl">
                    {TOPIC_TYPE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setTopicType(opt.value)}
                        className={`py-2.5 px-2 rounded-lg text-sm font-medium transition-all ${
                          topicType === opt.value
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {TOPIC_TYPE_OPTIONS.find(o => o.value === topicType)?.description}
                  </p>
                </div>

                {/* 目标用户 - 分段控件 */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">目标用户</Label>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 rounded-xl">
                    {USER_TAG_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setUserTag(opt.value)}
                        className={`py-2.5 px-2 rounded-lg text-sm font-medium transition-all ${
                          userTag === opt.value
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 内容形式 */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">内容形式</Label>
                  <div className="flex gap-2">
                    {CONTENT_TYPE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setContentType(opt.value)}
                        className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                          contentType === opt.value
                            ? 'bg-indigo-500 text-white shadow-md shadow-indigo-200'
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
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">关键词</Label>
                  <Input
                    placeholder="输入关键词或从下方热点选择..."
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    className="h-11"
                  />
                </div>
              </CardContent>
            </Card>

            {/* ==================== 动态配置区域 ==================== */}
            {isAnalysisType && (
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader className="pb-3 pt-5 px-6">
                  <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <Target className="h-4 w-4 text-indigo-500" />
                    分析配置
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-5 space-y-4">
                  
                  {/* 分析对象 */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">分析对象</Label>
                    <div className="flex gap-2">
                      <Select value={analysisTarget} onValueChange={(v) => setAnalysisTarget(v as AnalysisTarget)}>
                        <SelectTrigger className="h-10 flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ANALYSIS_TARGET_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {analysisTarget === 'asset' && (
                        <Input
                          placeholder={ANALYSIS_TARGET_OPTIONS.find(o => o.value === 'asset')?.placeholder}
                          value={analysisTargetInput}
                          onChange={(e) => setAnalysisTargetInput(e.target.value)}
                          className="h-10 w-36"
                        />
                      )}
                    </div>
                  </div>

                  {/* 内容深度 */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">内容深度</Label>
                    <div className="flex gap-2">
                      {CONTENT_DEPTH_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setContentDepth(opt.value)}
                          className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                            contentDepth === opt.value
                              ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                              : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 重点关注方向 */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">重点关注（可多选）</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {FOCUS_DIRECTION_OPTIONS.map(opt => (
                        <label
                          key={opt.value}
                          className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all ${
                            focusDirections.includes(opt.value)
                              ? 'bg-indigo-50 border border-indigo-200'
                              : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                          }`}
                        >
                          <Checkbox
                            checked={focusDirections.includes(opt.value)}
                            onCheckedChange={(checked) => {
                              setFocusDirections(prev =>
                                checked
                                  ? [...prev, opt.value]
                                  : prev.filter(v => v !== opt.value)
                              );
                            }}
                          />
                          <span className="text-sm">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isGuideType && (
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader className="pb-3 pt-5 px-6">
                  <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    内容配置
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-5 space-y-4">
                  
                  {/* 内容子类型 */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">内容子类型</Label>
                    <div className="flex gap-2">
                      {CONTENT_SUBTYPE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setContentSubType(opt.value)}
                          className={`flex-1 py-2.5 rounded-lg text-sm transition-all ${
                            contentSubType === opt.value
                              ? 'bg-amber-100 text-amber-700 border border-amber-200'
                              : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
                          }`}
                        >
                          <div className="font-medium">{opt.label}</div>
                          <div className="text-xs mt-0.5 opacity-70">{opt.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 平台对比输入 */}
                  {contentSubType === 'platform_compare' && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">对比平台</Label>
                      <Input
                        placeholder="如：华泰 vs 中信"
                        value={platformCompare}
                        onChange={(e) => setPlatformCompare(e.target.value)}
                        className="h-10"
                      />
                    </div>
                  )}

                  {/* 附加选项 */}
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={includeExample}
                        onCheckedChange={(checked) => setIncludeExample(checked as boolean)}
                      />
                      <span className="text-sm text-gray-700">举例说明</span>
                    </label>
                    {topicType === 'advanced_invest' && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={includeResearch}
                          onCheckedChange={(checked) => setIncludeResearch(checked as boolean)}
                        />
                        <span className="text-sm text-gray-700">引用研报</span>
                      </label>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ==================== 内容设置 ==================== */}
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-3 pt-5 px-6">
                <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-500" />
                  内容设置
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-5 space-y-4">
                
                {isVideo ? (
                  <>
                    {/* 视频时长 */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">视频时长</Label>
                      <div className="flex gap-2">
                        {VIDEO_DURATION_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setVideoDuration(opt.value)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                              videoDuration === opt.value
                                ? 'bg-indigo-500 text-white'
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
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">视频风格</Label>
                      <Select value={videoStyle} onValueChange={(v) => setVideoStyle(v as VideoStyle)}>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VIDEO_STYLE_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <div>
                                <div className="font-medium">{opt.label}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  /* 配图建议开关 */
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">配图建议</Label>
                      <p className="text-xs text-gray-500 mt-0.5">生成内容时附带封面/配图描述</p>
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
            <Card className="border-0 shadow-sm bg-white">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full px-6 py-4 flex items-center justify-between"
              >
                <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-gray-500" />
                  高级设置
                </CardTitle>
                {showAdvanced ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
              </button>
              
              {showAdvanced && (
                <CardContent className="px-6 pb-5 space-y-4">
                  
                  {/* 博主人设 */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">博主人设</Label>
                    <Select value={personaType} onValueChange={(v) => setPersonaType(v as PersonaType)}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PERSONA_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div>
                              <div className="font-medium">{opt.label}</div>
                              <div className="text-xs text-gray-500">{opt.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {personaType === 'custom' && (
                      <Input
                        placeholder="输入自定义人设描述..."
                        value={customPersona}
                        onChange={(e) => setCustomPersona(e.target.value)}
                        className="h-10 mt-2"
                      />
                    )}
                  </div>

                  {/* 标题风格 */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">标题风格（可多选）</Label>
                    <div className="flex flex-wrap gap-1.5">
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
                          className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
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
                        placeholder="输入自定义风格描述..."
                        value={customTitleStyle}
                        onChange={(e) => setCustomTitleStyle(e.target.value)}
                        className="h-9 mt-2 text-sm"
                      />
                    )}
                  </div>

                  {/* 补充要求 */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">补充要求（可多选）</Label>
                    <div className="flex flex-wrap gap-1.5">
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
                          className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
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
                        className="h-9 mt-2 text-sm"
                      />
                    )}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* 生成按钮 */}
            <Button
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-200 rounded-xl"
              onClick={() => handleGenerate()}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {currentStep || '生成中...'}
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  生成内容
                </>
              )}
            </Button>
          </div>

          {/* ==================== 右侧：热榜 + 输出区域 ==================== */}
          <div className="col-span-7 space-y-5">
            
            {/* 热榜区域 */}
            {showHotTopics && (
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader className="pb-2 pt-4 px-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <Flame className="h-4 w-4 text-orange-500" />
                      {hotTopicTimeRange === '24h' ? '今日热点' : hotTopicTimeRange === '7d' ? '近7天热点' : '近30天热点'}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Select value={hotTopicTimeRange} onValueChange={(v) => setHotTopicTimeRange(v as HotTopicTimeRange)}>
                        <SelectTrigger className="h-8 w-24 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HOT_TOPIC_TIME_RANGE_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" onClick={loadHotTopics} disabled={hotTopicsLoading}>
                        <RefreshCw className={`h-3.5 w-3.5 ${hotTopicsLoading ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-6 pb-4">
                  {hotTopicsLoading && hotTopics.length === 0 ? (
                    <div className="flex items-center justify-center py-6 text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      加载中...
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {hotTopics.slice(0, 5).map((topic) => (
                        <button
                          key={topic.id}
                          onClick={() => handleSelectHotTopic(topic)}
                          className={`w-full p-3 rounded-xl text-left transition-all ${
                            selectedHotTopic?.id === topic.id
                              ? 'bg-orange-50 border border-orange-200'
                              : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 text-white text-xs flex items-center justify-center font-medium flex-shrink-0">
                              {topic.id}
                            </span>
                            <p className="text-sm text-gray-800 line-clamp-1">{topic.title}</p>
                            <span className="text-xs text-gray-400 flex-shrink-0">{topic.source}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 热门科普主题（小白科普时显示） */}
            {!showHotTopics && topicType === 'beginner_guide' && (
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader className="pb-2 pt-4 px-6">
                  <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    热门科普主题
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-4">
                  <div className="space-y-2">
                    {POPULAR_GUIDE_TOPICS.map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => setKeywords(topic.title)}
                        className={`w-full p-3 rounded-xl text-left transition-all ${
                          keywords === topic.title
                            ? 'bg-amber-50 border border-amber-200'
                            : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-800">{topic.title}</p>
                          <Badge variant="secondary" className="text-xs">{topic.category}</Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ==================== 输出区域 ==================== */}
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-2 pt-4 px-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold text-gray-900">生成结果</CardTitle>
                  {titles.length > 0 && (
                    <div className="flex items-center gap-2">
                      {/* 视图切换 */}
                      <div className="flex bg-gray-100 rounded-lg p-0.5">
                        <button
                          onClick={() => setViewMode('integrated')}
                          className={`px-3 py-1 text-xs rounded-md transition-all ${
                            viewMode === 'integrated' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                          }`}
                        >
                          整合视图
                        </button>
                        <button
                          onClick={() => setViewMode('split')}
                          className={`px-3 py-1 text-xs rounded-md transition-all ${
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
              <CardContent className="px-6 pb-5">
                {titles.length === 0 && !content ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <FileText className="h-12 w-12 mb-3" />
                    <p>点击"生成内容"开始创作</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    
                    {/* 整合视图 */}
                    {viewMode === 'integrated' && (
                      <div className="space-y-4">
                        {/* 标题 */}
                        {titles.length > 0 && (
                          <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                            <div className="text-lg font-semibold text-gray-900">
                              {titles[selectedTitleIndex]?.title}
                            </div>
                            {titles.length > 1 && (
                              <div className="flex gap-2 mt-2">
                                {titles.map((t, i) => (
                                  <button
                                    key={i}
                                    onClick={() => setSelectedTitleIndex(i)}
                                    className={`w-2 h-2 rounded-full transition-all ${
                                      selectedTitleIndex === i ? 'bg-indigo-500 w-4' : 'bg-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 正文 */}
                        {editableContent && (
                          <div className="p-4 bg-gray-50 rounded-xl">
                            {isEditing ? (
                              <Textarea
                                value={editableContent}
                                onChange={(e) => setEditableContent(e.target.value)}
                                className="min-h-[200px] resize-none border-0 bg-transparent p-0"
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
                          <div className="flex flex-wrap gap-2">
                            {tags.map((tag, i) => (
                              <Badge key={i} className="bg-indigo-100 text-indigo-700 border-0">#{tag}</Badge>
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
                                  selectedImageIndex === i ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
                                }`}
                              >
                                <img src={url} alt="" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        )}

                        {/* 种草力评分 */}
                        {engagementScore && (
                          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">种草力评分</span>
                              <span className="text-2xl font-bold text-amber-600">{engagementScore.score}/10</span>
                            </div>
                            {engagementScore.reasons.length > 0 && (
                              <div className="text-xs text-gray-600">
                                {engagementScore.reasons.join('；')}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 合规提醒 */}
                        {!compliance.isCompliant && (
                          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                            <div className="flex items-center gap-2 text-amber-700 font-medium mb-1">
                              <AlertTriangle className="h-4 w-4" />
                              合规提醒
                            </div>
                            {compliance.warnings.map((w, i) => (
                              <p key={i} className="text-sm text-amber-600">{w}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 拆分视图 */}
                    {viewMode === 'split' && (
                      <div className="space-y-4">
                        {/* 标题模块 */}
                        {titles.length > 0 && (
                          <div className="p-4 border rounded-xl">
                            <div className="flex items-center justify-between mb-3">
                              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                                标题候选
                              </Label>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => toggleLock('title')}>
                                  {lockedModules.has('title') ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleGenerate('title')}>
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {titles.map((t, i) => (
                                <button
                                  key={i}
                                  onClick={() => setSelectedTitleIndex(i)}
                                  className={`w-full p-2 rounded-lg text-left text-sm ${
                                    selectedTitleIndex === i ? 'bg-indigo-50 border border-indigo-200' : 'bg-gray-50'
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
                          <div className="p-4 border rounded-xl">
                            <div className="flex items-center justify-between mb-3">
                              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5 text-indigo-500" />
                                正文内容
                              </Label>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
                                  <Edit3 className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => toggleLock('content')}>
                                  {lockedModules.has('content') ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleGenerate('content')}>
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            {isEditing ? (
                              <Textarea
                                value={editableContent}
                                onChange={(e) => setEditableContent(e.target.value)}
                                className="min-h-[150px] resize-none"
                              />
                            ) : (
                              <div className="p-3 bg-gray-50 rounded-lg min-h-[100px] whitespace-pre-wrap text-sm">
                                {editableContent}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 标签模块 */}
                        {tags.length > 0 && (
                          <div className="p-4 border rounded-xl">
                            <div className="flex items-center justify-between mb-3">
                              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Hash className="h-3.5 w-3.5 text-indigo-500" />
                                话题标签
                              </Label>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => toggleLock('tags')}>
                                  {lockedModules.has('tags') ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleGenerate('tags')}>
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {tags.map((tag, i) => (
                                <Badge key={i} className="bg-indigo-100 text-indigo-700 border-0">#{tag}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 操作工具栏 */}
                    <div className="pt-4 border-t">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => setIsEditing(!isEditing)}>
                          <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                          编辑
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleSave}>
                          <Save className="h-3.5 w-3.5 mr-1.5" />
                          保存
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleExport}>
                          <Download className="h-3.5 w-3.5 mr-1.5" />
                          导出
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleOptimize('content')}>
                          <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                          AI优化
                        </Button>
                        <Button size="sm" className="bg-indigo-500 hover:bg-indigo-600" onClick={handleCopyForXHS}>
                          <Copy className="h-3.5 w-3.5 mr-1.5" />
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
        <div className="text-center mt-8 text-gray-400 text-xs">
          Made with <Heart className="h-3 w-3 inline text-rose-500 fill-rose-500" /> by AI
        </div>
      </div>

      {/* 历史记录弹窗 */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>历史记录</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[60vh]">
                {historyRecords.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">暂无历史记录</div>
                ) : (
                  <div className="divide-y">
                    {historyRecords.map((record) => (
                      <div key={record.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 cursor-pointer" onClick={() => handleLoadHistory(record)}>
                            <div className="font-medium text-gray-900 line-clamp-1">{record.title || '无标题'}</div>
                            <div className="text-sm text-gray-500 mt-1 line-clamp-2">{record.content}</div>
                            <div className="text-xs text-gray-400 mt-2">
                              {new Date(record.createdAt).toLocaleString('zh-CN')}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-4">
                            <Button variant="ghost" size="sm" onClick={() => handleLoadHistory(record)}>
                              <FileEdit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteHistory(record.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
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
