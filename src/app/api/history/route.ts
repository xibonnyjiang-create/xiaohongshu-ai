import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 历史记录类型
interface HistoryRecord {
  id: string;
  title: string;
  content: string;
  tags: string[];
  image_urls: string[];
  selected_image_url?: string;
  engagement_score?: {
    score: number;
    reasons: string[];
    suggestions: string[];
  };
  is_favorite: boolean;
  created_at: string;
}

// GET: 获取历史记录列表
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const { data, error } = await client
      .from('history_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw new Error(`查询失败: ${error.message}`);
    
    return NextResponse.json({ records: data as HistoryRecord[] });
  } catch (error) {
    console.error('Get history error:', error);
    return NextResponse.json({ error: '获取历史记录失败' }, { status: 500 });
  }
}

// POST: 创建历史记录
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    
    const { data, error } = await client
      .from('history_records')
      .insert({
        title: body.title || '',
        content: body.content || '',
        tags: body.tags || [],
        image_urls: body.imageUrls || [],
        selected_image_url: body.imageUrl || null,
        engagement_score: body.engagementScore || null,
        is_favorite: false,
      })
      .select()
      .single();
    
    if (error) throw new Error(`保存失败: ${error.message}`);
    
    return NextResponse.json({ record: data });
  } catch (error) {
    console.error('Save history error:', error);
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}

// DELETE: 删除历史记录
export async function DELETE(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: '缺少ID' }, { status: 400 });
    }
    
    const { error } = await client
      .from('history_records')
      .delete()
      .eq('id', id);
    
    if (error) throw new Error(`删除失败: ${error.message}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete history error:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}

// PUT: 更新历史记录（如收藏状态）
export async function PUT(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { id, ...updates } = body;
    
    if (!id) {
      return NextResponse.json({ error: '缺少ID' }, { status: 400 });
    }
    
    const { data, error } = await client
      .from('history_records')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`更新失败: ${error.message}`);
    
    return NextResponse.json({ record: data });
  } catch (error) {
    console.error('Update history error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
