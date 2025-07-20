import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    fullname: v.string(),
    email: v.string(),
    bio: v.optional(v.string()),
    image: v.string(),
    posts: v.number(),
    clerkId: v.string(),
  }).index("by_clerk_id", ["clerkId"]),

  posts: defineTable({
    userId: v.id("users"),
    imageUrl: v.string(),
    storageId: v.id("_storage"), // will be needed when we want to delete an image
  }).index("by_user", ["userId"]),

  products: defineTable({
    userId: v.id("users"), // Who uploaded it
    imageUrl: v.string(), // OCR image
    storageId: v.id("_storage"), // To delete image
    extractedText: v.string(), // Raw OCR text
    status: v.string(), // "approved", "rejected", "pending"
    parsedItems: v.optional(
      v.array(
        // Structured product list
        v.object({
          name: v.string(),
          price: v.optional(v.number()),
          quantity: v.optional(v.string()),
        })
      )
    ),
    createdAt: v.string(),
  }).index("by_user", ["userId"]),

  //live listing schema
  live_listings: defineTable({
    userId: v.id("users"),
    productId: v.id("products"),
    title: v.string(), // Display name for UI
    description: v.optional(v.string()),
    price: v.number(),
    quantityAvailable: v.number(),
    imageUrl: v.string(),
    isActive: v.boolean(), // To control visibility
    createdAt: v.string(), // ISO timestamp
  }).index("by_user", ["userId"]),

  //sales dashboard schema
  sales: defineTable({
    buyerId: v.id("users"),
    sellerId: v.id("users"),
    productId: v.id("products"),
    quantity: v.number(),
    totalPrice: v.number(),
    status: v.string(), // "pending", "completed", "cancelled"
    createdAt: v.string(), // Order time
  })
    .index("by_buyer", ["buyerId"])
    .index("by_seller", ["sellerId"]),
});