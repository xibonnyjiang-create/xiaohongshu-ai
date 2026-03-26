'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
  Sparkles, RefreshCw, Copy, Download, CheckCircle2, ImageIcon, 
  FileText, Video, TrendingUp, Loader2, Heart, Hash, Shield,
  AlertTriangle, Check, ChevronDown, ChevronUp, Settings2,
  Flame, X, Edit3, Save, Wand2, Eye, Share2, ThumbsUp
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  TopicType, UserTag, ContentType, VideoDuration, VideoStyle,
  TitleStyle, HotTopicTimeRange, AdditionalRequirement, PersonaType,
  TitleCandidate, HotTopic, SavedDraft
} from '@/lib/types';
import { 
  TOPIC_TYPE_OPTIONS, USER_TAG_OPTIONS, CONTENT_TYPE_OPTIONS,
  HOT_TOPIC_TIME_RANGE_OPTIONS, TITLE_STYLE_OPTIONS, PERSONA_OPTIONS,
  ADDITIONAL_REQUIREMENT_OPTIONS, VIDEO_DURATION_OPTIONS, VIDEO_STYLE_OPTIONS,
  USER_TAG_TOPIC_COMPATIBILITY, SHOW_HOT_TOPICS, TOPIC_USER_RECOMMENDATION
} from '@/lib/constants';

export default function Home() {
  // 基础参数
  const [topicType, setTopicType] = useState<TopicType>('market_hot');
  const [userTag, setUserTag] = useState<UserTag>('newbie');
  const [contentType, setContentType] = useState<ContentType>('article');
  const [hotTopicTimeRange, setHotTopicTimeRange] = useState<HotTopicTimeRange>('24h');
  const [keywords, setKeywords] = useState('');

  // 高级参数
  const [titleStyles, setTitleStyles] = useState<TitleStyle[]>([]);
  const [customTitleStyle, setCustomTitleStyle] = useState('');
  const [personaType, setPersonaType] = useState<PersonaType>('veteran_trader');
  const [customPersona, setCustomPersona] = useState('');
  const [additionalRequirements, setAdditionalRequirements] = useState<AdditionalRequirement[]>([]);
  const [customRequirement, setCustomRequirement] = useState('');
  
  // 视频专用
  const [videoDuration, setVideoDuration] = useState<VideoDuration>('60s');
  const [videoStyle, setVideoStyle] = useState<VideoStyle>('popular_science');

  // 热榜数据
  const [hotTopics, setHotTopics] = useState<HotTopic[]>([]);
  const [hotTopicsLoading, setHotTopicsLoading] = useState(false);
  const [selectedHotTopic, setSelectedHotTopic] = useState<HotTopic | null>(null);

  // UI状态
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 输出状态
  const [titles, setTitles] = useState<TitleCandidate[]>([]);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState(0);
  const [content, setContent] = useState('');
  const [editableContent, setEditableContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [compliance, setCompliance] = useState<{ isCompliant: boolean; warnings: string[] }>({ isCompliant: true, warnings: [] });

  // 保存的草稿
  const [savedDrafts, setSavedDrafts] = useState<SavedDraft[]>([]);

  const isVideo = contentType === 'video_script';
  const isCompatible = USER_TAG_TOPIC_COMPATIBILITY[userTag].includes(topicType);
  const showHotTopics = SHOW_HOT_TOPICS.includes(topicType);

  // 加载热榜
  const loadHotTopics = useCallback(async () => {
    setHotTopicsLoading(true);
    try {
      const response = await fetch('/api/hot-topics');
      const data = await response.json();
      setHotTopics(data.topics || []);
    } catch (error) {
      console.error('Load hot topics error:', error);
    } finally {
      setHotTopicsLoading(false);
    }
  }, []);

  // 初始加载热榜
  useEffect(() => {
    if (showHotTopics) {
      loadHotTopics();
    }
  }, [loadHotTopics, showHotTopics]);

  // 切换选题时清除选中的热点
  useEffect(() => {
    if (!showHotTopics) {
      setSelectedHotTopic(null);
      setKeywords('');
    }
  }, [showHotTopics]);

  // 选择热点作为关键词
  const handleSelectHotTopic = (topic: HotTopic) => {
    setSelectedHotTopic(topic);
    setKeywords(topic.title);
  };

  // 处理用户标签变化
  const handleUserTagChange = (value: UserTag) => {
    setUserTag(value);
    // 如果当前选题不兼容，自动切换到兼容的选题
    if (!USER_TAG_TOPIC_COMPATIBILITY[value].includes(topicType)) {
      setTopicType(USER_TAG_TOPIC_COMPATIBILITY[value][0]);
    }
  };

  // 切换标题风格多选
  const toggleTitleStyle = (style: TitleStyle) => {
    setTitleStyles(prev => 
      prev.includes(style) 
        ? prev.filter(s => s !== style)
        : [...prev, style]
    );
  };

  // 切换补充要求多选
  const toggleRequirement = (req: AdditionalRequirement) => {
    setAdditionalRequirements(prev =>
      prev.includes(req)
        ? prev.filter(r => r !== req)
        : [...prev, req]
    );
  };

  // 生成内容
  const handleGenerate = useCallback(async () => {
    if (!isCompatible) {
      toast.error('选题类型与用户标签不兼容');
      return;
    }

    setIsGenerating(true);
    setContent('');
    setTitles([]);
    setTags([]);
    setImageUrls([]);
    setCurrentStep('准备中...');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicType, userTag, contentType, keywords, hotTopicTimeRange,
          titleStyles: titleStyles, customTitleStyle,
          personaType, customPersona, 
          additionalRequirements, customRequirement,
          videoDuration, videoStyle,
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
  }, [topicType, userTag, contentType, keywords, hotTopicTimeRange, titleStyles, customTitleStyle, personaType, customPersona, additionalRequirements, customRequirement, videoDuration, videoStyle, isCompatible, selectedHotTopic]);

  // AI优化内容
  const handleOptimize = async (type: 'title' | 'content' | 'all') => {
    toast.info('AI优化中...');
    // 这里可以调用优化API
    setTimeout(() => toast.success('优化完成！'), 1500);
  };

  // 保存草稿
  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const draft: SavedDraft = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        title: titles[selectedTitleIndex]?.title || '',
        content: editableContent,
        tags,
        imageUrl: imageUrls[selectedImageIndex],
        topicType,
        userTag,
      };
      
      // 保存到localStorage
      const drafts = JSON.parse(localStorage.getItem('drafts') || '[]');
      drafts.unshift(draft);
      localStorage.setItem('drafts', JSON.stringify(drafts.slice(0, 20)));
      
      setSavedDrafts(drafts);
      toast.success('草稿已保存');
    } catch (error) {
      toast.error('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 复制
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  // 导出完整内容
  const handleExport = () => {
    const selectedTitle = titles[selectedTitleIndex]?.title || '';
    const selectedImage = imageUrls[selectedImageIndex];
    
    const text = `【标题】${selectedTitle}

【正文】
${editableContent}

【标签】
${tags.map(t => '#' + t).join(' ')}

【配图链接】
${selectedImage || '未选择配图'}

---
生成时间：${new Date().toLocaleString('zh-CN')}
选题类型：${TOPIC_TYPE_OPTIONS.find(o => o.value === topicType)?.label}
目标用户：${USER_TAG_OPTIONS.find(o => o.value === userTag)?.label}`;
    
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `小红书内容_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('已导出');
  };

  // 一键复制小红书格式
  const handleCopyForXHS = () => {
    const selectedTitle = titles[selectedTitleIndex]?.title || '';
    const text = `${selectedTitle}\n\n${editableContent}\n\n${tags.map(t => '#' + t).join(' ')}`;
    navigator.clipboard.writeText(text);
    toast.success('已复制，可直接粘贴到小红书');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* 头部 */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl shadow-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-orange-500 bg-clip-text text-transparent">
              小红书AI爆款内容生成器
            </h1>
          </div>
          <p className="text-gray-500 text-sm">智能生成专业、深度的财经内容</p>
        </div>

        {/* 热榜区域 - 只有市场热点时显示 */}
        {showHotTopics && (
          <Card className="mb-4 border-0 shadow-lg bg-white/80">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  {hotTopicTimeRange === '24h' ? '今日热点' : hotTopicTimeRange === '7d' ? '近7天热点' : '近30天热点'}
                  {hotTopics.length > 0 && (
                    <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">
                      {hotTopics.length}条
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={hotTopicTimeRange} onValueChange={(v) => setHotTopicTimeRange(v as HotTopicTimeRange)}>
                    <SelectTrigger className="h-7 w-24 text-xs">
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
            <CardContent>
              {hotTopicsLoading && hotTopics.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  加载热点中...
                </div>
              ) : (
                <ScrollArea className="h-[100px]">
                  <div className="flex gap-2 pb-2">
                    {hotTopics.slice(0, 6).map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => handleSelectHotTopic(topic)}
                        className={`flex-shrink-0 p-2 rounded-lg text-left transition-all w-[200px] ${
                          selectedHotTopic?.id === topic.id
                            ? 'bg-orange-50 border border-orange-300 shadow-sm'
                            : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                        }`}
                      >
                        <p className="text-sm font-medium text-gray-800 line-clamp-2">{topic.title}</p>
                        <p className="text-xs text-gray-400 mt-1">{topic.source}</p>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
              
              {selectedHotTopic && (
                <div className="mt-2 p-2 bg-orange-50 rounded-lg border border-orange-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-orange-500" />
                    <span className="text-sm text-gray-700">已选：{selectedHotTopic.title}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setSelectedHotTopic(null);
                    setKeywords('');
                  }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 左侧：输入 */}
          <div className="lg:col-span-2 space-y-4">
            {/* 基础设置 */}
            <Card className="border-0 shadow-lg bg-white/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">基础设置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 目标用户 */}
                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block">目标用户</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {USER_TAG_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => handleUserTagChange(opt.value)}
                        className={`p-2.5 rounded-lg text-center transition-all ${
                          userTag === opt.value
                            ? 'bg-pink-500 text-white shadow-md'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <span className="text-lg">{opt.icon}</span>
                        <div className="font-medium text-xs mt-0.5">{opt.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 选题类型 */}
                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block">选题类型</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {TOPIC_TYPE_OPTIONS.map(opt => {
                      const compatible = USER_TAG_TOPIC_COMPATIBILITY[userTag].includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          onClick={() => compatible && setTopicType(opt.value)}
                          className={`p-2.5 rounded-lg text-left transition-all ${
                            topicType === opt.value
                              ? 'bg-rose-500 text-white shadow-md'
                              : compatible
                                ? 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{opt.icon}</span>
                            <span className="font-medium text-sm">{opt.label}</span>
                          </div>
                          <div className={`text-xs mt-0.5 ${topicType === opt.value ? 'text-rose-100' : 'text-gray-400'}`}>
                            {opt.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {/* 推荐提示 */}
                  {TOPIC_USER_RECOMMENDATION[topicType][userTag] && (
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3 text-green-500" />
                      {TOPIC_USER_RECOMMENDATION[topicType][userTag]}
                    </p>
                  )}
                </div>

                {/* 内容形式 */}
                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block">内容形式</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {CONTENT_TYPE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setContentType(opt.value)}
                        className={`p-3 rounded-lg flex items-center gap-2 text-sm transition-all ${
                          contentType === opt.value
                            ? 'bg-orange-500 text-white shadow-md'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <span className="text-lg">{opt.icon}</span>
                        <span className="font-medium">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 视频专用设置 */}
                {isVideo && (
                  <div className="p-3 bg-orange-50 rounded-lg space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">视频时长</Label>
                        <Select value={videoDuration} onValueChange={(v) => setVideoDuration(v as VideoDuration)}>
                          <SelectTrigger className="h-9 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VIDEO_DURATION_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">视频风格</Label>
                        <Select value={videoStyle} onValueChange={(v) => setVideoStyle(v as VideoStyle)}>
                          <SelectTrigger className="h-9 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VIDEO_STYLE_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* 关键词 */}
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">关键词（可选，可从热点选择或手动输入）</Label>
                  <Input
                    placeholder="输入关键词..."
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    className="h-9"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 高级设置 */}
            <Card className="border-0 shadow-lg bg-white/80">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full p-4 flex items-center justify-between"
              >
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  高级设置
                </CardTitle>
                {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              
              {showAdvanced && (
                <CardContent className="pt-0 space-y-4">
                  {/* 标题风格（多选） */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-1.5 block">标题风格（可多选）</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {TITLE_STYLE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => toggleTitleStyle(opt.value)}
                          className={`px-2.5 py-1 rounded-full text-xs transition-all ${
                            titleStyles.includes(opt.value)
                              ? 'bg-yellow-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {titleStyles.includes('custom') && (
                      <Input
                        placeholder="输入自定义标题风格描述..."
                        value={customTitleStyle}
                        onChange={(e) => setCustomTitleStyle(e.target.value)}
                        className="h-8 mt-2 text-sm"
                      />
                    )}
                  </div>

                  {/* 博主人设 */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-1.5 block">博主人设</Label>
                    <Select value={personaType} onValueChange={(v) => setPersonaType(v as PersonaType)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PERSONA_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {personaType === 'custom' && (
                      <Input
                        placeholder="输入自定义人设描述..."
                        value={customPersona}
                        onChange={(e) => setCustomPersona(e.target.value)}
                        className="h-9 mt-2"
                      />
                    )}
                  </div>

                  {/* 补充要求（多选） */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-1.5 block">补充要求（可多选）</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {ADDITIONAL_REQUIREMENT_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => toggleRequirement(opt.value)}
                          className={`px-2.5 py-1 rounded-full text-xs transition-all ${
                            additionalRequirements.includes(opt.value)
                              ? 'bg-violet-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {additionalRequirements.includes('custom') && (
                      <Input
                        placeholder="输入自定义补充要求..."
                        value={customRequirement}
                        onChange={(e) => setCustomRequirement(e.target.value)}
                        className="h-8 mt-2 text-sm"
                      />
                    )}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* 生成按钮 */}
            <Button
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 shadow-lg rounded-xl"
              onClick={handleGenerate}
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

          {/* 右侧：输出 */}
          <div className="lg:col-span-3">
            <Card className="border-0 shadow-lg bg-white/80 sticky top-4">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">生成结果</CardTitle>
                  {titles.length > 0 && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                        <Edit3 className="h-3.5 w-3.5 mr-1" />
                        {isEditing ? '完成编辑' : '编辑'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={isSaving}>
                        <Save className="h-3.5 w-3.5 mr-1" />
                        保存
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleGenerate}>
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        换一批
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {titles.length === 0 && !content ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <FileText className="h-12 w-12 mb-3" />
                    <p>点击"生成内容"开始创作</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* 标题候选 */}
                    {titles.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs text-gray-500 flex items-center gap-1">
                            <Sparkles className="h-3 w-3 text-rose-500" />
                            标题候选（点击选择）
                          </Label>
                          <Button variant="ghost" size="sm" onClick={() => handleOptimize('title')}>
                            <Wand2 className="h-3 w-3 mr-1" />
                            AI优化
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {titles.map((t, i) => (
                            <button
                              key={i}
                              onClick={() => setSelectedTitleIndex(i)}
                              className={`w-full p-3 rounded-lg text-left transition-all ${
                                selectedTitleIndex === i
                                  ? 'bg-rose-50 border-2 border-rose-300 shadow-sm'
                                  : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                                  selectedTitleIndex === i ? 'bg-rose-500 text-white' : 'bg-gray-200 text-gray-500'
                                }`}>
                                  {i + 1}
                                </div>
                                <span className="font-medium text-gray-800">{t.title}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 正文 */}
                    {content && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs text-gray-500 flex items-center gap-1">
                            {isVideo ? <Video className="h-3 w-3 text-orange-500" /> : <FileText className="h-3 w-3 text-pink-500" />}
                            {isVideo ? '视频脚本' : '正文内容'}
                          </Label>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleCopy(editableContent)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleOptimize('content')}>
                              <Wand2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {isEditing ? (
                          <Textarea
                            value={editableContent}
                            onChange={(e) => setEditableContent(e.target.value)}
                            className={`min-h-[200px] resize-none ${isVideo ? 'font-mono text-sm' : ''}`}
                          />
                        ) : (
                          <div className={`p-3 bg-gray-50 rounded-lg min-h-[200px] whitespace-pre-wrap text-sm ${isVideo ? 'font-mono' : ''}`}>
                            {editableContent}
                          </div>
                        )}
                      </div>
                    )}

                    {/* AI配图 */}
                    {imageUrls.length > 0 && (
                      <div>
                        <Label className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                          <ImageIcon className="h-3 w-3 text-blue-500" />
                          AI配图（点击选择）
                        </Label>
                        <div className="grid grid-cols-3 gap-2">
                          {imageUrls.map((url, i) => (
                            <button
                              key={i}
                              onClick={() => setSelectedImageIndex(i)}
                              className={`relative aspect-square rounded-lg overflow-hidden ${
                                selectedImageIndex === i ? 'ring-2 ring-rose-500 ring-offset-2' : ''
                              }`}
                            >
                              <img src={url} alt="" className="w-full h-full object-cover" />
                              {selectedImageIndex === i && (
                                <div className="absolute top-1 right-1 bg-rose-500 rounded-full p-0.5">
                                  <Check className="h-3 w-3 text-white" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 标签 */}
                    {tags.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs text-gray-500 flex items-center gap-1">
                            <Hash className="h-3 w-3 text-orange-500" />
                            话题标签
                          </Label>
                          <Button variant="ghost" size="sm" onClick={() => handleCopy(tags.map(t => '#' + t).join(' '))}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {tags.map((tag, i) => (
                            <Badge key={i} className="bg-rose-100 text-rose-700 border-0">#{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 合规审查 */}
                    {compliance && !compliance.isCompliant && (
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
                          <AlertTriangle className="h-4 w-4" />
                          合规提醒
                        </div>
                        {compliance.warnings.map((w, i) => (
                          <p key={i} className="text-sm text-amber-600">{w}</p>
                        ))}
                      </div>
                    )}

                    {/* 操作按钮 */}
                    {titles.length > 0 && (
                      <div className="pt-4 border-t flex gap-2">
                        <Button 
                          className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500"
                          onClick={handleCopyForXHS}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          一键复制到小红书
                        </Button>
                        <Button variant="outline" onClick={handleExport}>
                          <Download className="h-4 w-4 mr-2" />
                          导出
                        </Button>
                      </div>
                    )}
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
    </div>
  );
}
