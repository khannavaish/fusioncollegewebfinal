import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function GET() {
  try {
    let config = await prisma.websiteConfig.findUnique({
      where: { id: 'default' }
    });

    const settings = await prisma.systemSettings.findUnique({ where: { id: 'global' } });
    const sessionName = settings?.activeSessionName || 'Session 2026';

    if (!config) {
      config = await prisma.websiteConfig.create({
        data: {
          id: 'default',
          heroTagLine: `Admissions Open · ${sessionName}`,
          isBlinking: false
        }
      });
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    return NextResponse.json(config, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching website config:', error);
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { heroTagLine, isBlinking } = body;

    const settings = await prisma.systemSettings.findUnique({ where: { id: 'global' } });
    const sessionName = settings?.activeSessionName || 'Session 2026';

    const config = await prisma.websiteConfig.upsert({
      where: { id: 'default' },
      update: {
        heroTagLine: heroTagLine !== undefined ? heroTagLine : undefined,
        isBlinking: isBlinking !== undefined ? isBlinking : undefined,
      },
      create: {
        id: 'default',
        heroTagLine: heroTagLine || `Admissions Open · ${sessionName}`,
        isBlinking: isBlinking || false,
      }
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error updating website config:', error);
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}
