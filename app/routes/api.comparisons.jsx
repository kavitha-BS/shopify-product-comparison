import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  if (request.method === "POST") {
    const body = await request.json();
    
    // Handle saving comparison sets
    if (body.type === "saveComparison") {
      const { name, products } = body;
      
      try {
        const comparison = await prisma.comparisonSet.create({
          data: {
            shop: session.shop,
            name,
            products: JSON.stringify(products),
          },
        });
        
        return json({ success: true, comparison });
      } catch (error) {
        return json({ success: false, error: error.message }, { status: 500 });
      }
    }
    
    // Handle updating comparison attributes configuration
    if (body.type === "updateConfig") {
      const { attributes } = body;
      
      try {
        // Check if config exists
        const existingConfig = await prisma.comparisonConfig.findUnique({
          where: { shop: session.shop },
        });
        
        let config;
        if (existingConfig) {
          config = await prisma.comparisonConfig.update({
            where: { shop: session.shop },
            data: { attributes: JSON.stringify(attributes) },
          });
        } else {
          config = await prisma.comparisonConfig.create({
            data: {
              shop: session.shop,
              attributes: JSON.stringify(attributes),
            },
          });
        }
        
        return json({ success: true, config });
      } catch (error) {
        return json({ success: false, error: error.message }, { status: 500 });
      }
    }
  }
  
  return json({ success: false, error: "Method not allowed" }, { status: 405 });
};

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  try {
    const comparisons = await prisma.comparisonSet.findMany({
      where: { shop: session.shop },
      orderBy: { createdAt: "desc" },
    });
    
    // Get comparison configuration
    const config = await prisma.comparisonConfig.findUnique({
      where: { shop: session.shop },
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
    
    return json({ comparisons, attributes });
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
};