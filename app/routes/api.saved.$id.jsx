import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.public.appProxy(request);
  const { id } = params;
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const sessionId = url.searchParams.get("sessionId");
  const customerId = url.searchParams.get("customerId");

  if (!shop || !id) {
    return json({ error: "Shop and comparison ID are required" }, { status: 400 });
  }

  try {
    // Build where clause for authorization
    const whereClause = {
      id: id,
      shop: shop,
    };

    // Add authorization based on user type
    if (customerId) {
      whereClause.customerId = customerId;
    } else if (sessionId) {
      whereClause.AND = [
        { sessionId: sessionId },
        { customerId: null } // Ensure guest users can't access customer comparisons
      ];
    } else {
      return json({ 
        success: false,
        error: "Authentication required" 
      }, { status: 401 });
    }

    const comparison = await prisma.comparisonSet.findFirst({
      where: whereClause,
    });

    if (!comparison) {
      return json({ 
        success: false,
        error: "Comparison not found or access denied" 
      }, { status: 404 });
    }

    return json({ 
      success: true,
      comparison: {
        id: comparison.id,
        name: comparison.name,
        products: comparison.products, // Frontend will parse this
        createdAt: comparison.createdAt,
        customerId: comparison.customerId,
        sessionId: comparison.sessionId
      }
    });

  } catch (error) {
    console.error('Error fetching comparison:', error);
    return json({ 
      success: false,
      error: "Failed to fetch comparison details" 
    }, { status: 500 });
  }
};

export const action = async ({ request, params }) => {
  const { session } = await authenticate.public.appProxy(request); // Changed from admin to public
  const { id } = params;

  if (request.method !== "DELETE") {
    return json({ success: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { shop, sessionId, customerId } = await request.json();

    if (!shop || !id) {
      return json({ 
        success: false,
        error: "Shop and comparison ID are required" 
      }, { status: 400 });
    }

    // Build where clause for authorization
    const whereClause = {
      id: id,
      shop: shop,
    };

    // Add authorization based on user type
    if (customerId) {
      whereClause.customerId = customerId;
    } else if (sessionId) {
      whereClause.AND = [
        { sessionId: sessionId },
        { customerId: null } // Ensure guest users can't delete customer comparisons
      ];
    } else {
      return json({ 
        success: false,
        error: "Authentication required" 
      }, { status: 401 });
    }

    // Delete the comparison with proper authorization
    const deletedComparison = await prisma.comparisonSet.deleteMany({
      where: whereClause,
    });

    if (deletedComparison.count === 0) {
      return json({ 
        success: false,
        error: "Comparison not found or access denied" 
      }, { status: 404 });
    }

    return json({ 
      success: true,
      message: "Comparison deleted successfully" 
    });

  } catch (error) {
    console.error('Error deleting comparison:', error);
    return json({ 
      success: false,
      error: "Failed to delete comparison. Please try again." 
    }, { status: 500 });
  }
};