'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  ExternalLink,
  Heart
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

  // 检查选项兼容性
  const isTopicCompatible = USER_TAG_TOPIC_COMPATIBILITY[userTag].includes(topicType);
  const isHotTopicSupported = HOT_TOPIC_SUPPORTED.includes(topicType);

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
    setCurrentStep('正在生成标题...');

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
                } else if (data.type === 'image') {
                  accumulatedResult.imageUrl = data.data;
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

  // 复制内容
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  // 导出内容
  const handleExport = () => {
    if (!result) return;
    
    const exportContent = `标题：${result.title}\n\n正文：\n${result.content}\n\n标签：${result.tags.map(t => '#' + t).join(' ')}\n\n${result.complianceCheck.warnings.length > 0 ? '合规提醒：\n' + result.complianceCheck.warnings.join('\n') : ''}`;
    
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50">
      {/* 装饰背景 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-pink-200 to-rose-200 rounded-full opacity-30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-orange-200 to-amber-200 rounded-full opacity-30 blur-3xl" />
      </div>

      <div className="relative container mx-auto px-4 py-8 max-w-7xl">
        {/* 头部 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-rose-500 to-pink-500 rounded-2xl shadow-lg shadow-rose-500/30">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-rose-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
              小红书AI爆款内容生成器
            </h1>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            基于AI大模型，智能生成符合金融合规要求的爆款内容
            <span className="inline-flex items-center gap-1 ml-2 text-rose-500">
              <Sparkles className="h-4 w-4" />
              一键创作
            </span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：输入模块 */}
          <div className="space-y-6">
            {/* 选题类型卡片 */}
            <Card className="border-0 shadow-xl shadow-rose-500/10 bg-white/80 backdrop-blur-sm overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400" />
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-2 bg-rose-100 rounded-lg">
                    <Target className="h-5 w-5 text-rose-600" />
                  </div>
                  选题类型
                </CardTitle>
                <CardDescription>选择内容方向，精准定位目标受众</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {TOPIC_TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTopicType(option.value)}
                      className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                        topicType === option.value
                          ? 'border-rose-400 bg-gradient-to-br from-rose-50 to-pink-50 shadow-md shadow-rose-500/10'
                          : 'border-gray-100 hover:border-rose-200 hover:bg-rose-50/50'
                      }`}
                    >
                      <div className="font-semibold text-gray-800 mb-1">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.description}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 用户标签卡片 */}
            <Card className="border-0 shadow-xl shadow-rose-500/10 bg-white/80 backdrop-blur-sm overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-rose-500 to-red-400" />
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-2 bg-pink-100 rounded-lg">
                    <Users className="h-5 w-5 text-pink-600" />
                  </div>
                  目标用户
                </CardTitle>
                <CardDescription>确定受众群体，生成更精准的内容</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {USER_TAG_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleUserTagChange(option.value)}
                      className={`p-3 rounded-xl border-2 text-center transition-all duration-200 ${
                        userTag === option.value
                          ? 'border-pink-400 bg-gradient-to-br from-pink-50 to-rose-50 shadow-md shadow-pink-500/10'
                          : 'border-gray-100 hover:border-pink-200 hover:bg-pink-50/50'
                      }`}
                    >
                      <div className="font-semibold text-gray-800 text-sm mb-1">{option.label}</div>
                      <div className="text-xs text-gray-500 truncate">{option.description}</div>
                    </button>
                  ))}
                </div>
                {!isTopicCompatible && (
                  <div className="flex items-center gap-2 text-amber-600 text-sm mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>已自动调整选题类型以匹配用户标签</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 内容类型和设置 */}
            <Card className="border-0 shadow-xl shadow-rose-500/10 bg-white/80 backdrop-blur-sm overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400" />
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <PenTool className="h-5 w-5 text-orange-600" />
                  </div>
                  内容设置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 内容类型 */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setContentType('article')}
                    className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all duration-200 ${
                      contentType === 'article'
                        ? 'border-orange-400 bg-gradient-to-br from-orange-50 to-amber-50 shadow-md shadow-orange-500/10'
                        : 'border-gray-100 hover:border-orange-200 hover:bg-orange-50/50'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${contentType === 'article' ? 'bg-orange-200' : 'bg-gray-100'}`}>
                      <FileText className={`h-5 w-5 ${contentType === 'article' ? 'text-orange-600' : 'text-gray-500'}`} />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-800">图文内容</div>
                      <div className="text-xs text-gray-500">小红书笔记</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setContentType('video_script')}
                    className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all duration-200 ${
                      contentType === 'video_script'
                        ? 'border-orange-400 bg-gradient-to-br from-orange-50 to-amber-50 shadow-md shadow-orange-500/10'
                        : 'border-gray-100 hover:border-orange-200 hover:bg-orange-50/50'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${contentType === 'video_script' ? 'bg-orange-200' : 'bg-gray-100'}`}>
                      <Video className={`h-5 w-5 ${contentType === 'video_script' ? 'text-orange-600' : 'text-gray-500'}`} />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-800">视频脚本</div>
                      <div className="text-xs text-gray-500">短视频内容</div>
                    </div>
                  </button>
                </div>

                {/* 今日爆款推荐 */}
                {isHotTopicSupported && (
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-rose-50 via-pink-50 to-orange-50 rounded-xl border border-rose-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-rose-400 to-pink-500 rounded-lg shadow-md shadow-rose-500/30">
                        <Zap className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">今日爆款推荐</div>
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
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">关键词（可选）</Label>
                  <Input
                    placeholder="输入关键词，如：价值投资、股息、定投..."
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    className="border-gray-200 focus:border-rose-300 focus:ring-rose-200"
                  />
                </div>

                {/* 生成按钮 */}
                <Button
                  className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-rose-500 via-pink-500 to-orange-500 hover:from-rose-600 hover:via-pink-600 hover:to-orange-600 shadow-lg shadow-rose-500/30 rounded-xl transition-all duration-300"
                  onClick={handleGenerate}
                  disabled={isGenerating || !isTopicCompatible}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      {currentStep || 'AI生成中...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      生成爆款内容
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：输出模块 */}
          <Card className="border-0 shadow-xl shadow-rose-500/10 bg-white/80 backdrop-blur-sm overflow-hidden lg:sticky lg:top-8 lg:self-start">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-2 bg-violet-100 rounded-lg">
                    <PenTool className="h-5 w-5 text-violet-600" />
                  </div>
                  生成结果
                </CardTitle>
                {result && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerate}
                    className="border-rose-200 text-rose-600 hover:bg-rose-50"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    换一批
                  </Button>
                )}
              </div>
              <CardDescription>AI生成的内容将在此展示</CardDescription>
            </CardHeader>
            <CardContent>
              {!result && !streamingContent ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl mb-4">
                    <ImageIcon className="h-16 w-16 text-gray-300" />
                  </div>
                  <p className="text-lg">点击"生成爆款内容"开始创作</p>
                  <p className="text-sm text-gray-300 mt-2">AI将为您生成标题、正文、标签和配图</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* 标题 */}
                  {result?.title && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-rose-500" />
                          爆款标题
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(result.title)}
                          className="text-gray-400 hover:text-rose-500"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="p-4 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border border-rose-100">
                        <div className="font-bold text-xl text-gray-800">{result.title}</div>
                      </div>
                    </div>
                  )}

                  {/* 正文 */}
                  {(result?.content || streamingContent) && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-pink-500" />
                          正文内容
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(result?.content || streamingContent)}
                          className="text-gray-400 hover:text-pink-500"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <Textarea
                        value={result?.content || streamingContent}
                        readOnly
                        className="min-h-[200px] resize-none border-gray-100 bg-gray-50/50 focus:bg-white text-gray-700 leading-relaxed"
                      />
                    </div>
                  )}

                  {/* 标签 */}
                  {result?.tags && result.tags.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Hash className="h-4 w-4 text-orange-500" />
                        热门标签
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {result.tags.map((tag, index) => (
                          <Badge
                            key={index}
                            className="px-3 py-1.5 bg-gradient-to-r from-rose-100 to-pink-100 text-rose-700 border-0 hover:from-rose-200 hover:to-pink-200 font-medium"
                          >
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 配图 */}
                  {result?.imageUrl && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-violet-500" />
                        AI配图
                      </Label>
                      <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden border border-gray-100">
                        <img
                          src={result.imageUrl}
                          alt="配图"
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    </div>
                  )}

                  {/* 合规审查 */}
                  {result?.complianceCheck && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Shield className={`h-4 w-4 ${result.complianceCheck.isCompliant ? 'text-green-500' : 'text-amber-500'}`} />
                        合规审查
                        {result.complianceCheck.isCompliant ? (
                          <Badge className="bg-green-100 text-green-700 border-0 ml-2">通过</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 border-0 ml-2">需注意</Badge>
                        )}
                      </Label>
                      {result.complianceCheck.warnings.length > 0 && (
                        <div className="space-y-2">
                          {result.complianceCheck.warnings.map((warning, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-sm"
                            >
                              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              {warning}
                            </div>
                          ))}
                        </div>
                      )}
                      {result.complianceCheck.suggestions.length > 0 && (
                        <div className="space-y-2">
                          {result.complianceCheck.suggestions.map((suggestion, index) => (
                            <div
                              key={index}
                              className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-blue-800 text-sm"
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
                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                      <Button
                        variant="outline"
                        className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl"
                        onClick={() => handleCopy(result.content)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        复制全文
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl"
                        onClick={handleExport}
                      >
                        <Download className="h-4 w-4 mr-2" />
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
        <div className="text-center mt-10 text-gray-400 text-sm">
          <p className="flex items-center justify-center gap-2">
            Made with <Heart className="h-4 w-4 text-rose-500 fill-rose-500" /> by AI
          </p>
        </div>
      </div>
    </div>
  );
}
