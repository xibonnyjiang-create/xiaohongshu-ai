'use client';

import { useState, useCallback } from 'react';
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
  Edit3, 
  Save, 
  AlertTriangle,
  CheckCircle2,
  ImageIcon,
  FileText,
  Video,
  TrendingUp
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

  // 检查选项兼容性
  const isTopicCompatible = USER_TAG_TOPIC_COMPATIBILITY[userTag].includes(topicType);
  const isHotTopicSupported = HOT_TOPIC_SUPPORTED.includes(topicType);

  // 处理用户标签变化
  const handleUserTagChange = (value: UserTag) => {
    setUserTag(value);
    // 如果当前选题类型不兼容，自动切换到第一个兼容的类型
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
                
                if (data.type === 'title') {
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
      toast.error('生成失败，请重试');
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
    
    const exportContent = `标题：${result.title}\n\n正文：\n${result.content}\n\n标签：${result.tags.join(' ')}\n\n合规提示：\n${result.complianceCheck.warnings.join('\n')}`;
    
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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* 头部 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <TrendingUp className="h-8 w-8 text-pink-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              小红书AI爆款内容生成器
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            基于AI大模型，自动生成符合金融合规要求的小红书爆款内容
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：输入模块 */}
          <Card className="shadow-lg border-pink-100">
            <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                输入模块
              </CardTitle>
              <CardDescription className="text-pink-50">
                选择内容参数，AI将为您生成爆款内容
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* 选题类型 */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">选题类型</Label>
                <Select value={topicType} onValueChange={(v) => setTopicType(v as TopicType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TOPIC_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-gray-500">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 用户标签 */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">目标用户</Label>
                <Select value={userTag} onValueChange={(v) => handleUserTagChange(v as UserTag)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_TAG_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-gray-500">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isTopicCompatible && (
                  <div className="flex items-center gap-2 text-amber-600 text-sm mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>此用户标签与当前选题类型不兼容，已自动调整</span>
                  </div>
                )}
              </div>

              {/* 内容类型 */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">内容类型</Label>
                <Tabs value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="article" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      图文内容
                    </TabsTrigger>
                    <TabsTrigger value="video_script" className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      视频脚本
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* 今日爆款推荐 */}
              {isHotTopicSupported && (
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-pink-500" />
                      今日爆款推荐
                    </Label>
                    <p className="text-sm text-gray-600">
                      AI自动捕捉实时热点，生成爆款内容
                    </p>
                  </div>
                  <Switch
                    checked={useHotTopic}
                    onCheckedChange={setUseHotTopic}
                  />
                </div>
              )}

              {/* 关键词输入 */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">关键词（可选）</Label>
                <Input
                  placeholder="输入关键词，如：价值投资、股息、定投..."
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                />
              </div>

              {/* 生成按钮 */}
              <Button
                className="w-full h-12 text-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                onClick={handleGenerate}
                disabled={isGenerating || !isTopicCompatible}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    AI生成中...
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

          {/* 右侧：输出模块 */}
          <Card className="shadow-lg border-pink-100">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-lg">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  输出模块
                </div>
                {result && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerate}
                    className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    换一批
                  </Button>
                )}
              </CardTitle>
              <CardDescription className="text-pink-50">
                AI生成的内容将在此展示
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {!result && !streamingContent ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <ImageIcon className="h-16 w-16 mb-4" />
                  <p>点击"生成爆款内容"开始创作</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 标题 */}
                  {result?.title && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">标题</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(result.title)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="p-3 bg-pink-50 rounded-lg font-medium text-lg">
                        {result.title}
                      </div>
                    </div>
                  )}

                  {/* 正文 */}
                  {(result?.content || streamingContent) && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">正文</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(result?.content || streamingContent)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <Textarea
                        value={result?.content || streamingContent}
                        readOnly
                        className="min-h-[200px] resize-none"
                      />
                    </div>
                  )}

                  {/* 标签 */}
                  {result?.tags && result.tags.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">标签</Label>
                      <div className="flex flex-wrap gap-2">
                        {result.tags.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700"
                          >
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 配图建议 */}
                  {result?.imageUrl && (
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">配图建议</Label>
                      <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={result.imageUrl}
                          alt="配图"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}

                  {/* 合规审查 */}
                  {result?.complianceCheck && (
                    <div className="space-y-2">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        {result.complianceCheck.isCompliant ? (
                          <>
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            合规审查通过
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            合规提醒
                          </>
                        )}
                      </Label>
                      {result.complianceCheck.warnings.length > 0 && (
                        <div className="space-y-2">
                          {result.complianceCheck.warnings.map((warning, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-amber-800 text-sm"
                            >
                              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              {warning}
                            </div>
                          ))}
                        </div>
                      )}
                      {result.complianceCheck.suggestions.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600 font-medium">优化建议：</p>
                          {result.complianceCheck.suggestions.map((suggestion, index) => (
                            <div
                              key={index}
                              className="p-3 bg-blue-50 rounded-lg text-blue-800 text-sm"
                            >
                              {suggestion}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 操作按钮 */}
                  {result && (
                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleCopy(result.content)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        复制全文
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
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
      </div>
    </div>
  );
}
