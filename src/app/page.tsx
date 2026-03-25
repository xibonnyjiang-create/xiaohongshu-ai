'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sparkles, 
  RefreshCw, 
  Copy, 
  Download, 
  AlertTriangle,
  CheckCircle2,
  ImageIcon,
  FileText,
  Video,
  TrendingUp,
  Zap,
  Target,
  Users,
  PenTool,
  Hash,
  Shield,
  Loader2,
  Heart,
  Flame,
  Clock,
  ExternalLink,
  ChevronRight,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { TopicType, UserTag, ContentType, GenerateResult } from '@/lib/types';
import { 
  TOPIC_TYPE_OPTIONS, 
  USER_TAG_OPTIONS, 
  CONTENT_TYPE_OPTIONS,
  USER_TAG_TOPIC_COMPATIBILITY,
  HOT_TOPIC_SUPPORTED
} from '@/lib/constants';

// 热点数据类型
interface HotTopic {
  id: number;
  title: string;
  source: string;
  snippet: string;
  url?: string;
  publishTime?: string;
}

export default function Home() {
  // 输入状态
  const [topicType, setTopicType] = useState<TopicType>('market_hot');
  const [userTag, setUserTag] = useState<UserTag>('beginner');
  const [contentType, setContentType] = useState<ContentType>('article');
  const [keywords, setKeywords] = useState('');
  const [useHotTopic, setUseHotTopic] = useState(true);

  // 输出状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [currentStep, setCurrentStep] = useState<string>('');
  
  // 多图选择状态
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);

  // 热点榜状态
  const [hotTopics, setHotTopics] = useState<HotTopic[]>([]);
  const [hotTopicsSummary, setHotTopicsSummary] = useState<string>('');
  const [hotTopicsTime, setHotTopicsTime] = useState<string>('');
  const [isLoadingHotTopics, setIsLoadingHotTopics] = useState(false);
  const [showHotTopicsPanel, setShowHotTopicsPanel] = useState(false);

  // 自定义图片prompt状态
  const [customImagePrompt, setCustomImagePrompt] = useState('');
  const [isRegeneratingImages, setIsRegeneratingImages] = useState(false);
  const [showCustomPromptInput, setShowCustomPromptInput] = useState(false);

  // 检查选项兼容性
  const isTopicCompatible = USER_TAG_TOPIC_COMPATIBILITY[userTag].includes(topicType);
  const isHotTopicSupported = HOT_TOPIC_SUPPORTED.includes(topicType);

  // 获取热点榜
  const fetchHotTopics = useCallback(async () => {
    setIsLoadingHotTopics(true);
    try {
      const response = await fetch('/api/hot-topics');
      const data = await response.json();
      setHotTopics(data.topics || []);
      setHotTopicsSummary(data.summary || '');
      setHotTopicsTime(data.updateTime || '');
    } catch (error) {
      console.error('Fetch hot topics error:', error);
    } finally {
      setIsLoadingHotTopics(false);
    }
  }, []);

  // 页面加载时获取热点
  useEffect(() => {
    fetchHotTopics();
  }, [fetchHotTopics]);

  // 处理用户标签变化
  const handleUserTagChange = (value: UserTag) => {
    setUserTag(value);
    if (!USER_TAG_TOPIC_COMPATIBILITY[value].includes(topicType)) {
      setTopicType(USER_TAG_TOPIC_COMPATIBILITY[value][0]);
    }
  };

  // 生成内容
  const handleGenerate = useCallback(async () => {
    if (!isTopicCompatible) {
      toast.error('选题类型与用户标签不兼容');
      return;
    }

    setIsGenerating(true);
    setStreamingContent('');
    setResult(null);
    setImageUrls([]);
    setSelectedImageIndex(0);
    setCurrentStep('准备中...');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicType,
          userTag,
          contentType,
          keywords,
          useHotTopic: useHotTopic && isHotTopicSupported,
        }),
      });

      if (!response.ok) {
        throw new Error('生成失败');
      }

      // 处理流式响应
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let accumulatedResult: GenerateResult = {
          title: '',
          content: '',
          tags: [],
          complianceCheck: { isCompliant: true, warnings: [], suggestions: [] },
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'status') {
                  setCurrentStep(data.data);
                } else if (data.type === 'title') {
                  accumulatedResult.title = data.data;
                } else if (data.type === 'content') {
                  accumulatedResult.content += data.data;
                  setStreamingContent(accumulatedResult.content);
                } else if (data.type === 'tags') {
                  accumulatedResult.tags = data.data;
                } else if (data.type === 'images') {
                  // 接收多张图片
                  setImageUrls(data.data);
                } else if (data.type === 'image') {
                  // 兼容单图格式
                  if (data.data) {
                    setImageUrls([data.data]);
                  }
                } else if (data.type === 'compliance') {
                  accumulatedResult.complianceCheck = data.data;
                  setCurrentStep('');
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }

        setResult(accumulatedResult);
        toast.success('内容生成完成！');
      }
    } catch (error) {
      console.error('生成错误:', error);
      toast.error('生成失败，请检查API配置后重试');
    } finally {
      setIsGenerating(false);
    }
  }, [topicType, userTag, contentType, keywords, useHotTopic, isTopicCompatible, isHotTopicSupported]);

  // 重新生成配图
  const handleRegenerateImages = useCallback(async (prompt?: string) => {
    const usePrompt = prompt || customImagePrompt;
    
    if (!usePrompt || usePrompt.trim().length === 0) {
      toast.error('请输入图片描述');
      return;
    }

    setIsRegeneratingImages(true);
    setSelectedImageIndex(0);

    try {
      const response = await fetch('/api/regenerate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: usePrompt, count: 4 }),
      });

      const data = await response.json();

      if (data.success && data.imageUrls.length > 0) {
        setImageUrls(data.imageUrls);
        toast.success(`已生成 ${data.imageUrls.length} 张新配图`);
        setCustomImagePrompt('');
      } else {
        toast.error(data.error || '图片生成失败');
      }
    } catch (error) {
      console.error('Regenerate images error:', error);
      toast.error('图片生成失败，请重试');
    } finally {
      setIsRegeneratingImages(false);
    }
  }, [customImagePrompt]);

  // 复制内容
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  // 导出内容
  const handleExport = () => {
    if (!result) return;
    
    const selectedImage = imageUrls[selectedImageIndex];
    const exportContent = `标题：${result.title}\n\n正文：\n${result.content}\n\n标签：${result.tags.map(t => '#' + t).join(' ')}\n\n${selectedImage ? `配图链接：${selectedImage}\n\n` : ''}${result.complianceCheck.warnings.length > 0 ? '合规提醒：\n' + result.complianceCheck.warnings.join('\n') : ''}`;
    
    const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `小红书内容_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('已导出文件');
  };

  // 选择图片
  const handleSelectImage = (index: number) => {
    setSelectedImageIndex(index);
    toast.success('已选择该配图');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50">
      {/* 装饰背景 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-pink-200 to-rose-200 rounded-full opacity-30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-orange-200 to-amber-200 rounded-full opacity-30 blur-3xl" />
      </div>

      <div className="relative container mx-auto px-4 py-6 max-w-7xl">
        {/* 头部 */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl shadow-lg shadow-rose-500/30">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
              小红书AI爆款内容生成器
            </h1>
          </div>
          <p className="text-gray-600">
            基于AI大模型，智能生成符合金融合规要求的爆款内容
            <span className="inline-flex items-center gap-1 ml-2 text-rose-500">
              <Sparkles className="h-4 w-4" />
              一键创作
            </span>
          </p>
        </div>

        {/* 热点榜开关 */}
        <div className="flex justify-center mb-4">
          <Button
            variant="outline"
            onClick={() => {
              setShowHotTopicsPanel(!showHotTopicsPanel);
              if (!showHotTopicsPanel) fetchHotTopics();
            }}
            className="border-rose-200 text-rose-600 hover:bg-rose-50"
          >
            <Flame className="h-4 w-4 mr-2" />
            {showHotTopicsPanel ? '收起热点榜' : '今日财经热点榜'}
            <ChevronRight className={`h-4 w-4 ml-2 transition-transform ${showHotTopicsPanel ? 'rotate-90' : ''}`} />
          </Button>
        </div>

        {/* 热点榜面板 */}
        {showHotTopicsPanel && (
          <Card className="mb-6 border-0 shadow-xl shadow-orange-500/10 bg-white/90 backdrop-blur-sm overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-red-400 to-pink-400" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Flame className="h-5 w-5 text-orange-500" />
                  今日财经热点榜
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  {hotTopicsTime && `更新于 ${hotTopicsTime}`}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchHotTopics}
                    disabled={isLoadingHotTopics}
                    className="ml-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingHotTopics ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingHotTopics ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                  <span className="ml-2 text-gray-500">正在获取热点...</span>
                </div>
              ) : hotTopics.length > 0 ? (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {hotTopics.map((topic, index) => (
                      <div
                        key={topic.id}
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-orange-50 transition-colors cursor-pointer group"
                        onClick={() => {
                          setKeywords(topic.title.substring(0, 20));
                          toast.success('已填入关键词');
                        }}
                      >
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                          index < 3 ? 'bg-gradient-to-br from-orange-400 to-red-500 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {topic.id}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-800 truncate group-hover:text-orange-600">
                            {topic.title}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {topic.source} · {topic.snippet.substring(0, 50)}...
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-orange-400 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  暂无热点数据
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：输入模块 */}
          <div className="space-y-4">
            {/* 选题类型卡片 */}
            <Card className="border-0 shadow-xl shadow-rose-500/10 bg-white/80 backdrop-blur-sm overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400" />
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="p-1.5 bg-rose-100 rounded-lg">
                    <Target className="h-4 w-4 text-rose-600" />
                  </div>
                  选题类型
                </CardTitle>
                <CardDescription className="text-xs">选择内容方向，精准定位目标受众</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {TOPIC_TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTopicType(option.value)}
                      className={`p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                        topicType === option.value
                          ? 'border-rose-400 bg-gradient-to-br from-rose-50 to-pink-50 shadow-md shadow-rose-500/10'
                          : 'border-gray-100 hover:border-rose-200 hover:bg-rose-50/50'
                      }`}
                    >
                      <div className="font-semibold text-gray-800 text-sm">{option.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{option.description}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 用户标签卡片 */}
            <Card className="border-0 shadow-xl shadow-rose-500/10 bg-white/80 backdrop-blur-sm overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-rose-500 to-red-400" />
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="p-1.5 bg-pink-100 rounded-lg">
                    <Users className="h-4 w-4 text-pink-600" />
                  </div>
                  目标用户
                </CardTitle>
                <CardDescription className="text-xs">确定受众群体，生成更精准的内容</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {USER_TAG_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleUserTagChange(option.value)}
                      className={`p-2.5 rounded-xl border-2 text-center transition-all duration-200 ${
                        userTag === option.value
                          ? 'border-pink-400 bg-gradient-to-br from-pink-50 to-rose-50 shadow-md shadow-pink-500/10'
                          : 'border-gray-100 hover:border-pink-200 hover:bg-pink-50/50'
                      }`}
                    >
                      <div className="font-semibold text-gray-800 text-xs mb-0.5">{option.label}</div>
                      <div className="text-xs text-gray-500 truncate">{option.description}</div>
                    </button>
                  ))}
                </div>
                {!isTopicCompatible && (
                  <div className="flex items-center gap-2 text-amber-600 text-xs mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
                    <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                    <span>已自动调整选题类型以匹配用户标签</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 内容类型和设置 */}
            <Card className="border-0 shadow-xl shadow-rose-500/10 bg-white/80 backdrop-blur-sm overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400" />
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="p-1.5 bg-orange-100 rounded-lg">
                    <PenTool className="h-4 w-4 text-orange-600" />
                  </div>
                  内容设置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* 内容类型 */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setContentType('article')}
                    className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-all duration-200 ${
                      contentType === 'article'
                        ? 'border-orange-400 bg-gradient-to-br from-orange-50 to-amber-50 shadow-md shadow-orange-500/10'
                        : 'border-gray-100 hover:border-orange-200 hover:bg-orange-50/50'
                    }`}
                  >
                    <FileText className={`h-4 w-4 ${contentType === 'article' ? 'text-orange-600' : 'text-gray-400'}`} />
                    <div className="text-left">
                      <div className="font-semibold text-gray-800 text-sm">图文内容</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setContentType('video_script')}
                    className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-all duration-200 ${
                      contentType === 'video_script'
                        ? 'border-orange-400 bg-gradient-to-br from-orange-50 to-amber-50 shadow-md shadow-orange-500/10'
                        : 'border-gray-100 hover:border-orange-200 hover:bg-orange-50/50'
                    }`}
                  >
                    <Video className={`h-4 w-4 ${contentType === 'video_script' ? 'text-orange-600' : 'text-gray-400'}`} />
                    <div className="text-left">
                      <div className="font-semibold text-gray-800 text-sm">视频脚本</div>
                    </div>
                  </button>
                </div>

                {/* 今日爆款推荐 */}
                {isHotTopicSupported && (
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-rose-50 via-pink-50 to-orange-50 rounded-xl border border-rose-100">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-gradient-to-br from-rose-400 to-pink-500 rounded-lg shadow-md shadow-rose-500/30">
                        <Zap className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800 text-sm">今日爆款推荐</div>
                        <div className="text-xs text-gray-500">AI自动捕捉实时热点</div>
                      </div>
                    </div>
                    <Switch
                      checked={useHotTopic}
                      onCheckedChange={setUseHotTopic}
                    />
                  </div>
                )}

                {/* 关键词输入 */}
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1 block">关键词（可选）</Label>
                  <Input
                    placeholder="输入关键词，或点击热点榜自动填入..."
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    className="border-gray-200 focus:border-rose-300 focus:ring-rose-200 h-9"
                  />
                </div>

                {/* 生成按钮 */}
                <Button
                  className="w-full h-11 text-base font-semibold bg-gradient-to-r from-rose-500 via-pink-500 to-orange-500 hover:from-rose-600 hover:via-pink-600 hover:to-orange-600 shadow-lg shadow-rose-500/30 rounded-xl transition-all duration-300"
                  onClick={handleGenerate}
                  disabled={isGenerating || !isTopicCompatible}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {currentStep || 'AI生成中...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      生成爆款内容
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：输出模块 */}
          <Card className="border-0 shadow-xl shadow-rose-500/10 bg-white/80 backdrop-blur-sm overflow-hidden lg:sticky lg:top-4 lg:self-start">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="p-1.5 bg-violet-100 rounded-lg">
                    <PenTool className="h-4 w-4 text-violet-600" />
                  </div>
                  生成结果
                </CardTitle>
                {result && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerate}
                    className="border-rose-200 text-rose-600 hover:bg-rose-50 h-7 text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    换一批
                  </Button>
                )}
              </div>
              <CardDescription className="text-xs">AI生成的内容将在此展示</CardDescription>
            </CardHeader>
            <CardContent>
              {!result && !streamingContent ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl mb-3">
                    <ImageIcon className="h-12 w-12 text-gray-300" />
                  </div>
                  <p>点击"生成爆款内容"开始创作</p>
                  <p className="text-xs text-gray-300 mt-1">AI将为您生成标题、正文、标签和配图</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 标题 */}
                  {result?.title && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-rose-500" />
                          爆款标题
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(result.title)}
                          className="text-gray-400 hover:text-rose-500 h-6 w-6 p-0"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="p-3 bg-gradient-to-r from-rose-50 to-pink-50 rounded-lg border border-rose-100">
                        <div className="font-bold text-lg text-gray-800">{result.title}</div>
                      </div>
                    </div>
                  )}

                  {/* 正文 */}
                  {(result?.content || streamingContent) && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-pink-500" />
                          正文内容
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(result?.content || streamingContent)}
                          className="text-gray-400 hover:text-pink-500 h-6 w-6 p-0"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Textarea
                        value={result?.content || streamingContent}
                        readOnly
                        className="min-h-[180px] resize-none border-gray-100 bg-gray-50/50 focus:bg-white text-gray-700 leading-relaxed text-sm"
                      />
                    </div>
                  )}

                  {/* 标签 */}
                  {result?.tags && result.tags.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5 text-orange-500" />
                        热门标签
                      </Label>
                      <div className="flex flex-wrap gap-1.5">
                        {result.tags.map((tag, index) => (
                          <Badge
                            key={index}
                            className="px-2.5 py-1 bg-gradient-to-r from-rose-100 to-pink-100 text-rose-700 border-0 hover:from-rose-200 hover:to-pink-200 font-medium text-xs"
                          >
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 配图选择 - 多图展示 */}
                  {imageUrls.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                          <ImageIcon className="h-3.5 w-3.5 text-violet-500" />
                          AI配图（点击选择）
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCustomPromptInput(!showCustomPromptInput)}
                          className="text-xs text-violet-600 hover:text-violet-700 h-6 px-2"
                        >
                          <PenTool className="h-3 w-3 mr-1" />
                          自定义描述
                        </Button>
                      </div>
                      
                      {/* 自定义prompt输入框 */}
                      {showCustomPromptInput && (
                        <div className="space-y-2 p-3 bg-violet-50 rounded-lg border border-violet-100">
                          <div className="text-xs text-violet-600 font-medium">
                            💡 描述你想要的配图风格（不会生成文字）：
                          </div>
                          <Textarea
                            placeholder="例如：一个温馨的咖啡馆场景，木质桌椅，阳光透过窗户洒进来，桌上放着笔记本电脑和一杯拿铁..."
                            value={customImagePrompt}
                            onChange={(e) => setCustomImagePrompt(e.target.value)}
                            className="min-h-[60px] text-xs border-violet-200 focus:border-violet-300 focus:ring-violet-200"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleRegenerateImages()}
                              disabled={isRegeneratingImages || !customImagePrompt.trim()}
                              className="flex-1 bg-violet-500 hover:bg-violet-600 text-white h-7 text-xs"
                            >
                              {isRegeneratingImages ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  生成中...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  重新生成
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowCustomPromptInput(false)}
                              className="h-7 text-xs border-violet-200 text-violet-600"
                            >
                              取消
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2">
                        {imageUrls.map((url, index) => (
                          <div
                            key={index}
                            onClick={() => handleSelectImage(index)}
                            className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
                              selectedImageIndex === index 
                                ? 'ring-2 ring-rose-500 ring-offset-2 shadow-lg' 
                                : 'hover:ring-2 hover:ring-rose-300 hover:ring-offset-1'
                            }`}
                          >
                            <img
                              src={url}
                              alt={`配图 ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {selectedImageIndex === index && (
                              <div className="absolute top-1.5 right-1.5 bg-rose-500 rounded-full p-0.5">
                                <Check className="h-3 w-3 text-white" />
                              </div>
                            )}
                            <div className="absolute bottom-1 left-1.5 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                              {index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* 快捷重新生成按钮 */}
                      {!showCustomPromptInput && (
                        <div className="flex items-center justify-center gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRegenerateImages('简约清新的投资理财插画，粉色和金色配色，温馨治愈的氛围，扁平化设计风格')}
                            disabled={isRegeneratingImages}
                            className="text-xs border-gray-200 text-gray-600 h-7"
                          >
                            {isRegeneratingImages ? <Loader2 className="h-3 w-3 animate-spin" /> : '🔄 换一批'}
                          </Button>
                        </div>
                      )}
                      
                      {imageUrls.length > 1 && (
                        <p className="text-xs text-gray-400 text-center">已选择第 {selectedImageIndex + 1} 张配图</p>
                      )}
                    </div>
                  )}

                  {/* 合规审查 */}
                  {result?.complianceCheck && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <Shield className={`h-3.5 w-3.5 ${result.complianceCheck.isCompliant ? 'text-green-500' : 'text-amber-500'}`} />
                        合规审查
                        {result.complianceCheck.isCompliant ? (
                          <Badge className="bg-green-100 text-green-700 border-0 ml-1.5 text-xs">通过</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 border-0 ml-1.5 text-xs">需注意</Badge>
                        )}
                      </Label>
                      {result.complianceCheck.warnings.length > 0 && (
                        <div className="space-y-1">
                          {result.complianceCheck.warnings.map((warning, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-xs"
                            >
                              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                              {warning}
                            </div>
                          ))}
                        </div>
                      )}
                      {result.complianceCheck.suggestions.length > 0 && (
                        <div className="space-y-1">
                          {result.complianceCheck.suggestions.map((suggestion, index) => (
                            <div
                              key={index}
                              className="p-2 bg-blue-50 rounded-lg border border-blue-200 text-blue-800 text-xs"
                            >
                              💡 {suggestion}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 操作按钮 */}
                  {result && (
                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                      <Button
                        variant="outline"
                        className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg h-9"
                        onClick={() => handleCopy(result.content)}
                      >
                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                        复制全文
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg h-9"
                        onClick={handleExport}
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        导出文件
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 底部提示 */}
        <div className="text-center mt-6 text-gray-400 text-xs">
          <p className="flex items-center justify-center gap-1.5">
            Made with <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" /> by AI
          </p>
        </div>
      </div>
    </div>
  );
}
