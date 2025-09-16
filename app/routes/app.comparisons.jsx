import { useLoaderData, useFetcher } from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import {
  Card,
  Layout,
  Page,
  Text,
  Button,
  BlockStack,
  InlineStack,
  Badge,
  Banner,
  ResourceList,
  ResourceItem,
  Icon,
  ButtonGroup,
  Box,
  TextField,
  Checkbox,
} from "@shopify/polaris";
import {
  DragHandleIcon,
} from "@shopify/polaris-icons";
import { useState, useCallback } from "react";
import { TitleBar } from "@shopify/app-bridge-react";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  try {
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
    
    return json({ attributes });
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  if (request.method === "POST") {
    const body = await request.json();
    
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

export default function ComparisonConfiguration() {
  const { attributes: initialAttributes, error } = useLoaderData();
  const fetcher = useFetcher();
  
  const [attributes, setAttributes] = useState(initialAttributes || []);

  const toggleAttribute = useCallback((index) => {
    const newAttributes = [...attributes];
    newAttributes[index].enabled = !newAttributes[index].enabled;
    setAttributes(newAttributes);
  }, [attributes]);

  const updateAttributeLabel = useCallback((index, newLabel) => {
    const newAttributes = [...attributes];
    newAttributes[index].label = newLabel;
    setAttributes(newAttributes);
  }, [attributes]);

  const saveConfiguration = useCallback(() => {
    fetcher.submit(
      JSON.stringify({
        type: "updateConfig",
        attributes: attributes,
      }),
      {
        method: "post",
        encType: "application/json",
      }
    );
  }, [attributes, fetcher]);

  const resetToDefaults = useCallback(() => {
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
    setAttributes(defaultAttributes);
  }, []);

  // Handle error state
  if (error) {
    return (
      <Page>
        <TitleBar title="Comparison Configuration" />
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2" tone="critical">
                  Error Loading Data
                </Text>
                <Text variant="bodyMd">
                  {error}
                </Text>
                <Button onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const AttributeConfigItem = ({ attribute, index }) => {
    const [localLabel, setLocalLabel] = useState(attribute.label);

    return (
      <ResourceItem
        id={attribute.key}
        media={
          <Box
            padding="200"
            background="bg-surface-secondary"
            borderRadius="100"
          >
            <Icon source={DragHandleIcon} tone="subdued" />
          </Box>
        }
      >
        <InlineStack gap="400" align="space-between">
          <InlineStack gap="400" align="start">
            <Checkbox
              checked={attribute.enabled}
              onChange={() => toggleAttribute(index)}
            />
            
            <Box minWidth="200px">
              <TextField
                value={localLabel}
                onChange={(value) => {
                  setLocalLabel(value);
                  updateAttributeLabel(index, value);
                }}
                autoComplete="off"
              />
            </Box>
          </InlineStack>
          
          <InlineStack gap="200" align="end">
            <Badge tone={attribute.enabled ? "success" : "info"}>
              {attribute.enabled ? "Enabled" : "Disabled"}
            </Badge>
            
            <Text variant="bodySm" tone="subdued">
              Order: {attribute.order}
            </Text>
          </InlineStack>
        </InlineStack>
      </ResourceItem>
    );
  };

  return (
    <Page>
      <TitleBar title="Comparison Configuration" />
      
      <Layout>
        <Layout.Section>
          <Banner
            title="Comparison Table Configuration"
            tone="info"
          >
            <Text variant="bodyMd">
              Configure which product attributes appear in your comparison tables.
              Toggle to enable/disable and customize labels for each attribute.
            </Text>
          </Banner>
        </Layout.Section>
        
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="headingMd" as="h2">
                  Product Attributes
                </Text>
                <ButtonGroup>
                  <Button onClick={resetToDefaults}>
                    Reset to Defaults
                  </Button>
                  <Button 
                    variant="primary"
                    onClick={saveConfiguration}
                    loading={fetcher.state === "submitting"}
                  >
                    Save Configuration
                  </Button>
                </ButtonGroup>
              </InlineStack>

              {fetcher.data?.success && (
                <Banner tone="success" onDismiss={() => {}}>
                  Configuration saved successfully!
                </Banner>
              )}

              <ResourceList
                items={attributes}
                renderItem={(attribute, index) => (
                  <AttributeConfigItem 
                    key={attribute.key} 
                    attribute={attribute} 
                    index={index} 
                  />
                )}
              />
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Preview
              </Text>
              
              <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                <BlockStack gap="200">
                  <Text variant="bodyMd" tone="subdued">
                    Enabled attributes will appear in this order:
                  </Text>
                  <InlineStack gap="100" wrap>
                    {attributes
                      .filter(attr => attr.enabled)
                      .map((attr, index) => (
                        <Badge key={attr.key} tone="success">
                          {index + 1}. {attr.label}
                        </Badge>
                      ))
                    }
                  </InlineStack>
                </BlockStack>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}