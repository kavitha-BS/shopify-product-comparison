import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  const { session } = await authenticate.public.appProxy(request);
  
  if (request.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { shop, name, products, sessionId, customerId } = await request.json();
    
    // Validate input
    if (!shop || !name || !products || !Array.isArray(products)) {
      return json({ 
        success: false, 
        error: "Missing required fields: shop, name, and products array" 
      }, { status: 400 });
    }

    if (products.length < 2) {
      return json({ 
        success: false, 
        error: "At least 2 products are required for comparison" 
      }, { status: 400 });
    }

    // Validate that either customerId or sessionId is provided
    if (!customerId && !sessionId) {
      return json({ 
        success: false, 
        error: "Either customer ID or session ID must be provided" 
      }, { status: 400 });
    }

    // Create the comparison with customer or session identifier
    const comparison = await prisma.comparisonSet.create({
      data: {
        shop: shop,
        name: name.trim(),
        products: JSON.stringify(products),
        customerId: customerId || null, // Store customer ID for logged-in users
        sessionId: sessionId || null,   // Store session ID for guest users
      },
    });

    return json({ 
      success: true, 
      comparison: {
        id: comparison.id,
        name: comparison.name,
        productCount: products.length,
        createdAt: comparison.createdAt
      }
    });

  } catch (error) {
    console.error('Error saving comparison:', error);
    return json({ 
      success: false, 
      error: "Failed to save comparison. Please try again." 
    }, { status: 500 });
  }
};