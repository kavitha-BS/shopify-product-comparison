import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const sessionId = url.searchParams.get("sessionId");
  const customerId = url.searchParams.get("customerId");

  if (!shop) {
    return json({ error: "Shop parameter is required" }, { status: 400 });
  }

  try {
    // Build where clause based on user type
    const whereClause = {
      shop: shop,
    };

    if (customerId) {
      // For logged-in customers, fetch their comparisons
      whereClause.customerId = customerId;
    } else if (sessionId) {
      // For guest users, fetch session-based comparisons
      whereClause.AND = [
        { sessionId: sessionId },
        { customerId: null } // Ensure we don't fetch customer-specific comparisons
      ];
    } else {
      // If neither customerId nor sessionId is provided, return empty result
      return json({ 
        success: true,
        comparisons: [] 
      });
    }

    const comparisons = await prisma.comparisonSet.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 50, // Limit to prevent too many results
    });

    // Transform the data for frontend
    const transformedComparisons = comparisons.map(comparison => ({
      id: comparison.id,
      name: comparison.name,
      products: comparison.products, // Keep as string, frontend will parse
      createdAt: comparison.createdAt,
      customerId: comparison.customerId,
      sessionId: comparison.sessionId,
      productCount: JSON.parse(comparison.products).length
    }));

    return json({ 
      success: true,
      comparisons: transformedComparisons 
    });

  } catch (error) {
    console.error('Error fetching saved comparisons:', error);
    return json({ 
      success: false,
      error: "Failed to fetch saved comparisons" 
    }, { status: 500 });
  }
};