import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../utils/appError';

/**
 * Public Endpoint: Tracks a single page view trigger asynchronously
 */
export const trackPageView = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { pageUrl, referrer } = req.body;
    if (!pageUrl) return next(new AppError('Page URL is required to log tracking indices.', 400));

    const ua = req.headers['user-agent'] || 'unknown';
    
    // Parse device types
    let deviceType = 'Desktop';
    if (/Mobi|Android|iPhone/i.test(ua)) deviceType = 'Mobile';
    else if (/Tablet|iPad/i.test(ua)) deviceType = 'Tablet';
    else if (/bot|crawler|spider|slurp/i.test(ua)) deviceType = 'Bot';

    // Parse standard web browsers
    let browser = 'Other';
    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';

    // Mock geolocation lookup based on IP address ranges
    let country = 'United States';
    let city = 'California';
    const clientIp = req.ip || '0.0.0.0';

    if (clientIp.startsWith('192.') || clientIp.startsWith('127.')) {
      country = 'Local Network';
      city = 'Dev Lab';
    } else if (Math.random() > 0.5) {
      country = 'India';
      city = 'Telangana';
    }

    // Save analytics log inside PostgreSQL
    await prisma.analyticsLog.create({
      data: {
        ipAddress: clientIp,
        pageUrl,
        referrer: referrer || 'Direct / None',
        userAgent: ua,
        deviceType,
        browser,
        country,
        city,
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Page view logged.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Protected Endpoint: Compiles metrics and lists of visitor trends
 */
export const getDashboardAnalytics = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const totalViews = await prisma.analyticsLog.count();

    // Calculate unique visitors based on IP
    const uniqueVisitorsResult = await prisma.analyticsLog.groupBy({
      by: ['ipAddress'],
      _count: {
        id: true,
      },
    });
    const uniqueVisitors = uniqueVisitorsResult.length;

    // Compile Top Pages (views per path)
    const topPages = await prisma.analyticsLog.groupBy({
      by: ['pageUrl'],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

    // Compile Traffic Sources
    const trafficSources = await prisma.analyticsLog.groupBy({
      by: ['referrer'],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

    // Segment by Device types
    const devices = await prisma.analyticsLog.groupBy({
      by: ['deviceType'],
      _count: {
        id: true,
      },
    });

    // Segment by Browsers
    const browsers = await prisma.analyticsLog.groupBy({
      by: ['browser'],
      _count: {
        id: true,
      },
    });

    // Segment by Countries
    const countries = await prisma.analyticsLog.groupBy({
      by: ['country'],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalPageViews: totalViews,
          totalUniqueVisitors: uniqueVisitors,
        },
        topPages: topPages.map((p) => ({ url: p.pageUrl, count: p._count.id })),
        trafficSources: trafficSources.map((r) => ({ source: r.referrer, count: r._count.id })),
        devices: devices.map((d) => ({ device: d.deviceType, count: d._count.id })),
        browsers: browsers.map((b) => ({ browser: b.browser, count: b._count.id })),
        countries: countries.map((c) => ({ country: c.country, count: c._count.id })),
      },
    });
  } catch (error) {
    next(error);
  }
};
