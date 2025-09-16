import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  try {
    // For public access from storefront
    const url = new URL(request.url);
    const shop = url.searchParams.get('shop');
    
    if (!shop) {
      return json({ error: "Shop parameter is required" }, { status: 400 });
    }

    // Get comparison configuration
    const config = await prisma.comparisonConfig.findUnique({
      where: { shop },
    });

    // Default attributes if no config exists
    const defaultAttributes = [
      { key: 'title', label: 'Product Name', enabled: true, order: 1 },
      { key: 'image', label: 'Image', enabled: true, order: 2 },
      { key: 'price', label: 'Price', enabled: true, order: 3 },
      { key: 'inventory', label: 'Inventory', enabled: true, order: 4 },
      { key: 'status', label: 'Status', enabled: false, order: 5 },
      { key: 'vendor', label: 'Vendor', enabled: false, order: 6 },
      { key: 'productType', label: 'Product Type', enabled: false, order: 7 },
      { key: 'tags', label: 'Tags', enabled: false, order: 8 },
      { key: 'createdAt', label: 'Created Date', enabled: false, order: 9 },
      { key: 'description', label: 'Description', enabled: false, order: 10 },
    ];

    const attributes = config ? JSON.parse(config.attributes) : defaultAttributes;
    
    // Filter only enabled attributes and sort by order
    const enabledAttributes = attributes
      .filter(attr => attr.enabled)
      .sort((a, b) => a.order - b.order);

    return json({ 
      success: true, 
      attributes: enabledAttributes 
    });
    
  } catch (error) {
    console.error('Error fetching comparison config:', error);
    return json({ error: error.message }, { status: 500 });
  }
};