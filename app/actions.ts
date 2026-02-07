"use server";

import client from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import crypto from "crypto";
import { sendPasswordResetEmail, sendTopicSharedEmail, sendFriendRequestEmail, sendTaskAssignedEmail, sendVerificationEmail } from "@/lib/email";

// Helper function to get current user ID
async function getCurrentUserId(): Promise<string | null> {
  try {
    const session = await auth();
    if (!session) {
      console.log("No session found");
      return null;
    }
    const userId = (session?.user?.id as string) || null;
    if (!userId) {
      console.log("No user ID in session:", session);
    }
    return userId;
  } catch (error) {
    console.error("Error getting current user ID:", error);
    return null;
  }
}

export interface Task {
  _id?: string;
  title: string;
  description: string;
  completed: boolean;
  assignedTo?: string; // User ID of the assigned user
  assignedToName?: string; // Name of the assigned user
  createdBy?: string; // User ID of the creator
  createdByName?: string; // Name of the creator
  deadline?: Date; // Optional deadline for the task
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Subject {
  _id?: string;
  title: string;
  description: string;
  color?: string; // Optional color for visual distinction
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Topic {
  _id?: string;
  title: string;
  description: string;
  linkedTopics: string[]; // Array of topic IDs this topic is linked to
  parentTopicId?: string; // Optional parent for hierarchical display
  subjectId?: string; // Optional subject this topic belongs to
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BlogPost {
  _id?: string;
  title: string;
  content: string;
  excerpt?: string; // Short preview of the content
  coverImage?: string; // URL for cover image
  published: boolean;
  authorId?: string;
  authorName?: string;
  authorEmail?: string;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  publishedAt?: Date;
}

export interface InventoryItem {
  _id?: string;
  name: string;
  amount: number;
  unit?: string;
  category?: string;
  userId?: string;
  familyId?: string;
  familyName?: string;
  finished?: boolean;
  finishedAt?: Date;
  finishedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function testDatabaseConnection() {
  let isConnected = false;
  try {
    const mongoClient = await client.connect();
    // Send a ping to confirm a successful connection
    await mongoClient.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    ); // because this is a server action, the console.log will be outputted to your terminal not in the browser
    return !isConnected;
  } catch (e) {
    console.error(e);
    return isConnected;
  }
}

// REGISTER - Register a new user
export async function registerUser(formData: FormData) {
  try {
    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const usersCollection = db.collection("users");

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;

    if (!email || !password) {
      return { success: false, error: "Email and password are required" };
    }

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      // If user exists but is not verified, allow resending verification
      if (!existingUser.emailVerified) {
        // Generate new verification token
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        await usersCollection.updateOne(
          { _id: existingUser._id },
          {
            $set: {
              verificationToken,
              verificationTokenExpiry,
            },
          }
        );
        
        // Send verification email
        await sendVerificationEmail(
          email,
          existingUser.name || email,
          verificationToken
        );
        
        return { 
          success: true, 
          needsVerification: true,
          message: "A new verification email has been sent. Please check your inbox." 
        };
      }
      return { success: false, error: "User already exists" };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const newUser = {
      email: email.trim(),
      password: hashedPassword,
      name: name?.trim() || email.trim(),
      emailVerified: false,
      verificationToken,
      verificationTokenExpiry,
      createdAt: new Date(),
    };

    await usersCollection.insertOne(newUser);
    
    // Send verification email
    await sendVerificationEmail(
      email,
      name?.trim() || email.trim(),
      verificationToken
    );
    
    return { 
      success: true, 
      needsVerification: true,
      message: "Please check your email to verify your account before logging in." 
    };
  } catch (error) {
    console.error("Error registering user:", error);
    return { success: false, error: "Failed to register user" };
  }
}

// Resend verification email
export async function resendVerificationEmail(email: string) {
  try {
    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne({ email: email.trim() });
    
    if (!user) {
      return { success: false, error: "User not found" };
    }
    
    if (user.emailVerified) {
      return { success: false, error: "Email is already verified" };
    }
    
    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          verificationToken,
          verificationTokenExpiry,
        },
      }
    );
    
    // Send verification email
    await sendVerificationEmail(
      email,
      user.name || email,
      verificationToken
    );
    
    return { success: true, message: "Verification email sent successfully" };
  } catch (error) {
    console.error("Error resending verification email:", error);
    return { success: false, error: "Failed to send verification email" };
  }
}

// PROFILE - Get current user profile
export interface UserProfile {
  _id: string;
  email: string;
  name: string;
  createdAt: Date;
  provider?: string; // 'google' for OAuth users, undefined for email/password users
  image?: string;
}

export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return null;
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { email: 1, name: 1, createdAt: 1, provider: 1, image: 1 } }
    );

    if (!user) {
      return null;
    }

    return {
      _id: user._id.toString(),
      email: user.email,
      name: user.name || user.email,
      createdAt: user.createdAt,
      provider: user.provider,
      image: user.image,
    };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

// PROFILE - Update current user profile
export async function updateUserProfile(formData: FormData) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const name = formData.get("name") as string;
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const usersCollection = db.collection("users");

    const updateData: Record<string, unknown> = {};

    // Update name if provided
    if (name && name.trim()) {
      updateData.name = name.trim();
    }

    // Update password if provided
    if (newPassword) {
      if (!currentPassword) {
        return { success: false, error: "Current password is required to change password" };
      }

      // Verify current password
      const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
      if (!user) {
        return { success: false, error: "User not found" };
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.password as string);
      if (!isPasswordValid) {
        return { success: false, error: "Current password is incorrect" };
      }

      // Hash new password
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: "No changes provided" };
    }

    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { ...updateData, updatedAt: new Date() } }
    );

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("Error updating user profile:", error);
    return { success: false, error: "Failed to update profile" };
  }
}

// Get all users (for assignment dropdown)
export interface User {
  _id: string;
  email: string;
  name: string;
}

// Get all users (deprecated - use getFriends for friend-only operations)
export async function getAllUsers(): Promise<User[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return [];
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const usersCollection = db.collection("users");

    const users = await usersCollection
      .find({}, { projection: { email: 1, name: 1 } })
      .toArray();

    return users.map((user) => ({
      _id: user._id.toString(),
      email: user.email,
      name: user.name || user.email,
    }));
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

// Get friends for sharing/assignment (only friends)
export async function getFriendsForSharing(): Promise<User[]> {
  try {
    const friends = await getFriends();
    return friends.map((friend) => ({
      _id: friend._id,
      email: friend.email,
      name: friend.name,
    }));
  } catch (error) {
    console.error("Error fetching friends for sharing:", error);
    return [];
  }
}

// CREATE - Add a new task
export async function createTask(formData: FormData) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const collection = db.collection("tasks");
    const usersCollection = db.collection("users");

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const assignedToId = formData.get("assignedTo") as string;
    const deadlineStr = formData.get("deadline") as string;

    if (!title || title.trim() === "") {
      return { success: false, error: "Title is required" };
    }

    // Get creator info
    const creator = await usersCollection.findOne({ _id: new ObjectId(userId) });
    const createdByName = creator?.name || creator?.email || "Unknown";

    // Get assigned user info if assigned (only friends can be assigned)
    let assignedToName: string | undefined;
    let assignedToObjId: ObjectId | undefined;
    if (assignedToId && assignedToId.trim() !== "") {
      // Verify the assigned user is a friend
      const friendRequestsCollection = db.collection("friendRequests");
      const friendship = await friendRequestsCollection.findOne({
        $or: [
          { from: new ObjectId(userId), to: new ObjectId(assignedToId), status: "accepted" },
          { to: new ObjectId(userId), from: new ObjectId(assignedToId), status: "accepted" },
        ],
      });

      if (!friendship) {
        return { success: false, error: "You can only assign tasks to your friends" };
      }

      const assignedUser = await usersCollection.findOne({ _id: new ObjectId(assignedToId) });
      if (assignedUser) {
        assignedToName = assignedUser.name || assignedUser.email;
        assignedToObjId = new ObjectId(assignedToId);
      }
    }

    // Parse deadline if provided
    let deadline: Date | undefined;
    if (deadlineStr && deadlineStr.trim() !== "") {
      deadline = new Date(deadlineStr);
    }

    const newTask: any = {
      title: title.trim(),
      description: description?.trim() || "",
      completed: false,
      userId: new ObjectId(userId), // Keep for backward compatibility
      createdBy: new ObjectId(userId),
      createdByName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (assignedToObjId) {
      newTask.assignedTo = assignedToObjId;
      newTask.assignedToName = assignedToName;
    }

    if (deadline) {
      newTask.deadline = deadline;
    }

    const result = await collection.insertOne(newTask);

    // Send email notification if task is assigned to someone else
    if (assignedToObjId && assignedToId !== userId) {
      const assignedUser = await usersCollection.findOne({ _id: assignedToObjId });
      if (assignedUser?.email) {
        sendTaskAssignedEmail(
          assignedUser.email,
          assignedUser.name || assignedUser.email,
          createdByName,
          title.trim(),
          description?.trim()
        ).catch((error) => {
          console.error("Failed to send task assignment email:", error);
        });
      }
    }

    revalidatePath("/crud");
    return { success: true, id: result.insertedId.toString() };
  } catch (error) {
    console.error("Error creating task:", error);
    return { success: false, error: "Failed to create task" };
  }
}

// READ - Get all tasks (tasks created by or assigned to current user)
export async function getTasks(): Promise<Task[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return [];
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const collection = db.collection("tasks");
    const usersCollection = db.collection("users");

    // Get tasks created by user OR assigned to user
    const tasks = await collection
      .find({
        $or: [
          { userId: new ObjectId(userId) },
          { createdBy: new ObjectId(userId) },
          { assignedTo: new ObjectId(userId) },
        ],
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Map tasks and populate user names if needed
    const tasksWithNames = await Promise.all(
      tasks.map(async (task) => {
        let createdByName = task.createdByName;
        let assignedToName = task.assignedToName;

        // If names are missing, fetch them
        if (!createdByName && task.createdBy) {
          const creator = await usersCollection.findOne({ _id: task.createdBy });
          createdByName = creator?.name || creator?.email || "Unknown";
        }

        if (!assignedToName && task.assignedTo) {
          const assigned = await usersCollection.findOne({ _id: task.assignedTo });
          assignedToName = assigned?.name || assigned?.email;
        }

        return {
          _id: task._id.toString(),
          title: task.title,
          description: task.description,
          completed: task.completed,
          assignedTo: task.assignedTo?.toString(),
          assignedToName,
          createdBy: task.createdBy?.toString() || task.userId?.toString(),
          createdByName: createdByName || "Unknown",
          deadline: task.deadline,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        };
      })
    );

    return tasksWithNames;
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }
}

// UPDATE - Update a task
export async function updateTask(taskId: string, formData: FormData) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const collection = db.collection("tasks");
    const usersCollection = db.collection("users");

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const completed = formData.get("completed") === "true";
    const assignedToId = formData.get("assignedTo") as string;
    const deadlineStr = formData.get("deadline") as string;

    if (!title || title.trim() === "") {
      return { success: false, error: "Title is required" };
    }

    // Check if user can update this task (creator or assigned user)
    const task = await collection.findOne({ _id: new ObjectId(taskId) });
    if (!task) {
      return { success: false, error: "Task not found" };
    }

    const canUpdate =
      task.userId?.toString() === userId ||
      task.createdBy?.toString() === userId ||
      task.assignedTo?.toString() === userId;

    if (!canUpdate) {
      return { success: false, error: "You don't have permission to update this task" };
    }

    // Get assigned user info if assigned (only friends can be assigned)
    let assignedToName: string | undefined;
    let assignedToObjId: ObjectId | undefined;
    if (assignedToId && assignedToId.trim() !== "") {
      // Verify the assigned user is a friend
      const friendRequestsCollection = db.collection("friendRequests");
      const friendship = await friendRequestsCollection.findOne({
        $or: [
          { from: new ObjectId(userId), to: new ObjectId(assignedToId), status: "accepted" },
          { to: new ObjectId(userId), from: new ObjectId(assignedToId), status: "accepted" },
        ],
      });

      if (!friendship) {
        return { success: false, error: "You can only assign tasks to your friends" };
      }

      const assignedUser = await usersCollection.findOne({ _id: new ObjectId(assignedToId) });
      if (assignedUser) {
        assignedToName = assignedUser.name || assignedUser.email;
        assignedToObjId = new ObjectId(assignedToId);
      }
    }

    // Parse deadline if provided
    let deadline: Date | undefined;
    if (deadlineStr && deadlineStr.trim() !== "") {
      deadline = new Date(deadlineStr);
    }

    const updateData: any = {
      title: title.trim(),
      description: description?.trim() || "",
      completed,
      updatedAt: new Date(),
    };

    if (assignedToObjId) {
      updateData.assignedTo = assignedToObjId;
      updateData.assignedToName = assignedToName;
    }

    if (deadline) {
      updateData.deadline = deadline;
    }

    const updateQuery: any = { $set: updateData };
    
    // Remove assignment if empty
    if (!assignedToObjId) {
      updateQuery.$unset = { assignedTo: "", assignedToName: "" };
    }

    // Remove deadline if empty
    if (!deadline) {
      updateQuery.$unset = { ...updateQuery.$unset, deadline: "" };
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(taskId) },
      updateQuery
    );

    if (result.matchedCount === 0) {
      return { success: false, error: "Task not found" };
    }

    // Send email notification if task is newly assigned to someone (different from before)
    const previousAssignee = task.assignedTo?.toString();
    if (assignedToObjId && assignedToId !== userId && assignedToId !== previousAssignee) {
      const assignedUser = await usersCollection.findOne({ _id: assignedToObjId });
      const updater = await usersCollection.findOne({ _id: new ObjectId(userId) });
      const updaterName = updater?.name || updater?.email || "Someone";
      
      if (assignedUser?.email) {
        sendTaskAssignedEmail(
          assignedUser.email,
          assignedUser.name || assignedUser.email,
          updaterName,
          title.trim(),
          description?.trim()
        ).catch((error) => {
          console.error("Failed to send task assignment email:", error);
        });
      }
    }

    revalidatePath("/crud");
    return { success: true };
  } catch (error) {
    console.error("Error updating task:", error);
    return { success: false, error: "Failed to update task" };
  }
}

// DELETE - Delete a task
export async function deleteTask(taskId: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const collection = db.collection("tasks");

    // Check if user can delete this task (creator only)
    const task = await collection.findOne({ _id: new ObjectId(taskId) });
    if (!task) {
      return { success: false, error: "Task not found" };
    }

    const canDelete =
      task.userId?.toString() === userId || task.createdBy?.toString() === userId;

    if (!canDelete) {
      return { success: false, error: "You don't have permission to delete this task" };
    }

    const result = await collection.deleteOne({
      _id: new ObjectId(taskId),
    });

    if (result.deletedCount === 0) {
      return { success: false, error: "Task not found" };
    }

    revalidatePath("/crud");
    return { success: true };
  } catch (error) {
    console.error("Error deleting task:", error);
    return { success: false, error: "Failed to delete task" };
  }
}

// TOGGLE - Toggle task completion status
export async function toggleTask(taskId: string, completed: boolean) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const collection = db.collection("tasks");

    // Check if user can toggle this task (creator or assigned user)
    const task = await collection.findOne({ _id: new ObjectId(taskId) });
    if (!task) {
      return { success: false, error: "Task not found" };
    }

    const canToggle =
      task.userId?.toString() === userId ||
      task.createdBy?.toString() === userId ||
      task.assignedTo?.toString() === userId;

    if (!canToggle) {
      return { success: false, error: "You don't have permission to toggle this task" };
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(taskId) },
      { $set: { completed: !completed, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return { success: false, error: "Task not found" };
    }

    revalidatePath("/crud");
    return { success: true };
  } catch (error) {
    console.error("Error toggling task:", error);
    return { success: false, error: "Failed to toggle task" };
  }
}

// ========== HOME INVENTORY CRUD OPERATIONS ==========

export async function getInventoryItems(familyId?: string): Promise<InventoryItem[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const collection = db.collection("inventory");
    const familiesCollection = db.collection("families");

    let query: Record<string, unknown>;
    const userFamilies = await familiesCollection
      .find({ members: new ObjectId(userId) })
      .toArray();
    const familyIds = userFamilies.map((f) => f._id);
    const familyNames: Record<string, string> = {};
    for (const f of userFamilies) {
      familyNames[f._id.toString()] = f.name;
    }

    if (familyId) {
      const family = await familiesCollection.findOne({
        _id: new ObjectId(familyId),
        members: new ObjectId(userId),
      });
      if (!family) return [];
      query = { familyId: new ObjectId(familyId) };
    } else {
      query = {
        $or: [
          { userId: new ObjectId(userId) },
          ...(familyIds.length > 0
            ? [{ familyId: { $in: familyIds } }]
            : []),
        ],
      };
    }

    const items = await collection
      .find(query)
      .sort({ category: 1, name: 1 })
      .toArray();

    return items.map((item: any) => {
      const fid = item.familyId?.toString();
      return {
        _id: item._id.toString(),
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        category: item.category,
        userId: item.userId?.toString(),
        familyId: fid,
        familyName: fid ? familyNames[fid] : undefined,
        finished: item.finished,
        finishedAt: item.finishedAt,
        finishedBy: item.finishedBy?.toString(),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return [];
  }
}

export async function createInventoryItem(formData: FormData) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: "Unauthorized" };

    const name = (formData.get("name") as string)?.trim();
    const amount = parseFloat((formData.get("amount") as string) || "0");
    const unit = (formData.get("unit") as string)?.trim() || undefined;
    const category = (formData.get("category") as string)?.trim() || undefined;
    const familyId = (formData.get("familyId") as string)?.trim() || undefined;

    if (!name) return { success: false, error: "Name is required" };
    if (isNaN(amount) || amount < 0) return { success: false, error: "Amount must be a valid number" };

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const collection = db.collection("inventory");
    const familiesCollection = db.collection("families");

    const doc: Record<string, unknown> = {
      name,
      amount,
      unit,
      category,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (familyId) {
      const family = await familiesCollection.findOne({
        _id: new ObjectId(familyId),
        members: new ObjectId(userId),
      });
      if (!family) return { success: false, error: "Family not found or access denied" };
      doc.familyId = new ObjectId(familyId);
    } else {
      doc.userId = new ObjectId(userId);
    }

    await collection.insertOne(doc);

    revalidatePath("/inventory");
    return { success: true };
  } catch (error) {
    console.error("Error creating inventory item:", error);
    return { success: false, error: "Failed to create item" };
  }
}

async function canModifyInventoryItem(itemId: string, userId: string): Promise<boolean> {
  const mongoClient = await client.connect();
  const db = mongoClient.db();
  const collection = db.collection("inventory");
  const item = await collection.findOne({ _id: new ObjectId(itemId) });
  if (!item) return false;
  if (item.userId && item.userId.toString() === userId) return true;
  if (item.familyId) {
    const family = await db.collection("families").findOne({
      _id: item.familyId,
      members: new ObjectId(userId),
    });
    return !!family;
  }
  return false;
}

export async function updateInventoryItem(itemId: string, formData: FormData) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: "Unauthorized" };

    const name = (formData.get("name") as string)?.trim();
    const amount = parseFloat((formData.get("amount") as string) || "0");
    const unit = (formData.get("unit") as string)?.trim() || undefined;
    const category = (formData.get("category") as string)?.trim() || undefined;

    if (!name) return { success: false, error: "Name is required" };
    if (isNaN(amount) || amount < 0) return { success: false, error: "Amount must be a valid number" };

    const canModify = await canModifyInventoryItem(itemId, userId);
    if (!canModify) return { success: false, error: "Item not found" };

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const collection = db.collection("inventory");

    const result = await collection.updateOne(
      { _id: new ObjectId(itemId) },
      { $set: { name, amount, unit, category, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) return { success: false, error: "Item not found" };

    revalidatePath("/inventory");
    return { success: true };
  } catch (error) {
    console.error("Error updating inventory item:", error);
    return { success: false, error: "Failed to update item" };
  }
}

export async function deleteInventoryItem(itemId: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: "Unauthorized" };

    const canModify = await canModifyInventoryItem(itemId, userId);
    if (!canModify) return { success: false, error: "Item not found" };

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const collection = db.collection("inventory");

    const result = await collection.deleteOne({ _id: new ObjectId(itemId) });

    if (result.deletedCount === 0) return { success: false, error: "Item not found" };

    revalidatePath("/inventory");
    return { success: true };
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    return { success: false, error: "Failed to delete item" };
  }
}

export async function markInventoryItemFinished(itemId: string, finished: boolean) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: "Unauthorized" };

    const canModify = await canModifyInventoryItem(itemId, userId);
    if (!canModify) return { success: false, error: "Item not found" };

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const collection = db.collection("inventory");

    const updateDoc = finished
      ? { $set: { finished: true, finishedAt: new Date(), finishedBy: new ObjectId(userId), updatedAt: new Date() } }
      : { $set: { finished: false, updatedAt: new Date() }, $unset: { finishedAt: "", finishedBy: "" } };

    const result = await collection.updateOne(
      { _id: new ObjectId(itemId) },
      updateDoc
    );

    if (result.matchedCount === 0) return { success: false, error: "Item not found" };

    revalidatePath("/inventory");
    return { success: true };
  } catch (error) {
    console.error("Error marking item finished:", error);
    return { success: false, error: "Failed to update item" };
  }
}

// ========== TOPIC CRUD OPERATIONS ==========

// CREATE - Add a new topic
export async function createTopic(formData: FormData) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const collection = db.collection("topics");

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const parentTopicId = formData.get("parentTopicId") as string;
    const subjectId = formData.get("subjectId") as string;

    if (!title || title.trim() === "") {
      return { success: false, error: "Title is required" };
    }

    const newTopic: any = {
      title: title.trim(),
      description: description?.trim() || "",
      linkedTopics: [],
      userId: new ObjectId(userId),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (parentTopicId && parentTopicId.trim() !== "") {
      newTopic.parentTopicId = parentTopicId.trim();
    }

    if (subjectId && subjectId.trim() !== "") {
      newTopic.subjectId = subjectId.trim();
    }

    const result = await collection.insertOne(newTopic);
    revalidatePath("/topics");
    return { success: true, id: result.insertedId.toString() };
  } catch (error) {
    console.error("Error creating topic:", error);
    return { success: false, error: "Failed to create topic" };
  }
}

// READ - Get all topics with full details
export async function getTopics(): Promise<Topic[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return [];
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const collection = db.collection("topics");

    const topics = await collection
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();

    return topics.map((topic) => ({
      _id: topic._id.toString(),
      title: topic.title,
      description: topic.description || "",
      linkedTopics: (topic.linkedTopics || []).map((id: ObjectId) =>
        id.toString()
      ),
      parentTopicId: topic.parentTopicId?.toString(),
      subjectId: topic.subjectId?.toString(),
      createdAt: topic.createdAt,
      updatedAt: topic.updatedAt,
    }));
  } catch (error) {
    console.error("Error fetching topics:", error);
    return [];
  }
}

// READ - Get a single topic by ID
export async function getTopic(topicId: string): Promise<Topic | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return null;
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const collection = db.collection("topics");

    const topic = await collection.findOne({
      _id: new ObjectId(topicId),
      userId: new ObjectId(userId),
    });

    if (!topic) {
      return null;
    }

    return {
      _id: topic._id.toString(),
      title: topic.title,
      description: topic.description || "",
      linkedTopics: (topic.linkedTopics || []).map((id: ObjectId) =>
        id.toString()
      ),
      parentTopicId: topic.parentTopicId?.toString(),
      subjectId: topic.subjectId?.toString(),
      createdAt: topic.createdAt,
      updatedAt: topic.updatedAt,
    };
  } catch (error) {
    console.error("Error fetching topic:", error);
    return null;
  }
}

// UPDATE - Update a topic
export async function updateTopic(topicId: string, formData: FormData) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const collection = db.collection("topics");

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const parentTopicId = formData.get("parentTopicId") as string;
    const subjectId = formData.get("subjectId") as string;

    if (!title || title.trim() === "") {
      return { success: false, error: "Title is required" };
    }

    const updateData: any = {
      title: title.trim(),
      description: description?.trim() || "",
      updatedAt: new Date(),
    };

    if (parentTopicId && parentTopicId.trim() !== "" && parentTopicId !== topicId) {
      updateData.parentTopicId = parentTopicId.trim();
    } else if (parentTopicId === "") {
      updateData.parentTopicId = null;
    }

    if (subjectId && subjectId.trim() !== "") {
      updateData.subjectId = subjectId.trim();
    } else if (subjectId === "") {
      updateData.subjectId = null;
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(topicId), userId: new ObjectId(userId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return { success: false, error: "Topic not found" };
    }

    revalidatePath("/topics");
    return { success: true };
  } catch (error) {
    console.error("Error updating topic:", error);
    return { success: false, error: "Failed to update topic" };
  }
}

// DELETE - Delete a topic
export async function deleteTopic(topicId: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const collection = db.collection("topics");

    // Remove topic from linkedTopics arrays of other topics owned by the same user
    await collection.updateMany(
      {
        userId: new ObjectId(userId),
        linkedTopics: new ObjectId(topicId),
      },
      { $pull: { linkedTopics: new ObjectId(topicId) } } as any
    );

    // Remove parentTopicId references for topics owned by the same user
    await collection.updateMany(
      {
        userId: new ObjectId(userId),
        parentTopicId: new ObjectId(topicId),
      },
      { $unset: { parentTopicId: "" } }
    );

    const result = await collection.deleteOne({
      _id: new ObjectId(topicId),
      userId: new ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      return { success: false, error: "Topic not found" };
    }

    revalidatePath("/topics");
    return { success: true };
  } catch (error) {
    console.error("Error deleting topic:", error);
    return { success: false, error: "Failed to delete topic" };
  }
}

// LINK - Link a topic to another topic
export async function linkTopics(topicId: string, linkedTopicId: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const collection = db.collection("topics");

    if (topicId === linkedTopicId) {
      return { success: false, error: "A topic cannot be linked to itself" };
    }

    // Verify both topics belong to the user
    const topic = await collection.findOne({
      _id: new ObjectId(topicId),
      userId: new ObjectId(userId),
    });
    const linkedTopic = await collection.findOne({
      _id: new ObjectId(linkedTopicId),
      userId: new ObjectId(userId),
    });

    if (!topic || !linkedTopic) {
      return { success: false, error: "Topic not found" };
    }

    // Add bidirectional link
    await collection.updateOne(
      { _id: new ObjectId(topicId), userId: new ObjectId(userId) },
      { $addToSet: { linkedTopics: new ObjectId(linkedTopicId) } }
    );

    await collection.updateOne(
      { _id: new ObjectId(linkedTopicId), userId: new ObjectId(userId) },
      { $addToSet: { linkedTopics: new ObjectId(topicId) } }
    );

    revalidatePath("/topics");
    return { success: true };
  } catch (error) {
    console.error("Error linking topics:", error);
    return { success: false, error: "Failed to link topics" };
  }
}

// UNLINK - Unlink a topic from another topic
export async function unlinkTopics(topicId: string, linkedTopicId: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const collection = db.collection("topics");

    // Remove bidirectional link
    await collection.updateOne(
      { _id: new ObjectId(topicId), userId: new ObjectId(userId) },
      { $pull: { linkedTopics: new ObjectId(linkedTopicId) } } as any
    );

    await collection.updateOne(
      { _id: new ObjectId(linkedTopicId), userId: new ObjectId(userId) },
      { $pull: { linkedTopics: new ObjectId(topicId) } } as any
    );

    revalidatePath("/topics");
    return { success: true };
  } catch (error) {
    console.error("Error unlinking topics:", error);
    return { success: false, error: "Failed to unlink topics" };
  }
}

// ========== SUBJECT CRUD OPERATIONS ==========

// CREATE - Add a new subject
export async function createSubject(formData: FormData) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const collection = db.collection("subjects");

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const color = formData.get("color") as string;

    if (!title || title.trim() === "") {
      return { success: false, error: "Title is required" };
    }

    const newSubject: any = {
      title: title.trim(),
      description: description?.trim() || "",
      color: color?.trim() || "#6366f1", // Default indigo color
      userId: new ObjectId(userId),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newSubject);
    revalidatePath("/topics");
    return { success: true, id: result.insertedId.toString() };
  } catch (error) {
    console.error("Error creating subject:", error);
    return { success: false, error: "Failed to create subject" };
  }
}

// READ - Get all subjects
export async function getSubjects(): Promise<Subject[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return [];
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const collection = db.collection("subjects");

    const subjects = await collection
      .find({ userId: new ObjectId(userId) })
      .sort({ title: 1 })
      .toArray();

    return subjects.map((subject) => ({
      _id: subject._id.toString(),
      title: subject.title,
      description: subject.description || "",
      color: subject.color || "#6366f1",
      createdAt: subject.createdAt,
      updatedAt: subject.updatedAt,
    }));
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return [];
  }
}

// READ - Get a single subject by ID
export async function getSubject(subjectId: string): Promise<Subject | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return null;
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const collection = db.collection("subjects");

    const subject = await collection.findOne({
      _id: new ObjectId(subjectId),
      userId: new ObjectId(userId),
    });

    if (!subject) {
      return null;
    }

    return {
      _id: subject._id.toString(),
      title: subject.title,
      description: subject.description || "",
      color: subject.color || "#6366f1",
      createdAt: subject.createdAt,
      updatedAt: subject.updatedAt,
    };
  } catch (error) {
    console.error("Error fetching subject:", error);
    return null;
  }
}

// UPDATE - Update a subject
export async function updateSubject(subjectId: string, formData: FormData) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const collection = db.collection("subjects");

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const color = formData.get("color") as string;

    if (!title || title.trim() === "") {
      return { success: false, error: "Title is required" };
    }

    const updateData: any = {
      title: title.trim(),
      description: description?.trim() || "",
      color: color?.trim() || "#6366f1",
      updatedAt: new Date(),
    };

    const result = await collection.updateOne(
      { _id: new ObjectId(subjectId), userId: new ObjectId(userId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return { success: false, error: "Subject not found" };
    }

    revalidatePath("/topics");
    return { success: true };
  } catch (error) {
    console.error("Error updating subject:", error);
    return { success: false, error: "Failed to update subject" };
  }
}

// DELETE - Delete a subject
export async function deleteSubject(subjectId: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const subjectsCollection = db.collection("subjects");
    const topicsCollection = db.collection("topics");

    // Remove subjectId from all topics that reference this subject
    await topicsCollection.updateMany(
      {
        userId: new ObjectId(userId),
        subjectId: subjectId,
      },
      { $unset: { subjectId: "" } }
    );

    const result = await subjectsCollection.deleteOne({
      _id: new ObjectId(subjectId),
      userId: new ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      return { success: false, error: "Subject not found" };
    }

    revalidatePath("/topics");
    return { success: true };
  } catch (error) {
    console.error("Error deleting subject:", error);
    return { success: false, error: "Failed to delete subject" };
  }
}

// ========== TOPIC SHARING OPERATIONS ==========

export interface SharedTopic {
  _id?: string;
  sharedBy: string; // User ID who shared
  sharedByName?: string; // Name of user who shared
  sharedWith: string[]; // Array of user IDs
  sharedWithNames?: { [userId: string]: string }; // Map of userId to name
  topicIds: string[]; // Array of topic IDs that were shared
  topics?: Topic[]; // Populated topic data
  createdAt?: Date;
}

// SHARE - Share topics with other users (only friends)
export async function shareTopics(topicIds: string[], sharedWithUserIds: string[]) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    if (!topicIds || topicIds.length === 0) {
      return { success: false, error: "Please select at least one topic to share" };
    }

    if (!sharedWithUserIds || sharedWithUserIds.length === 0) {
      return { success: false, error: "Please select at least one user to share with" };
    }

    // Prevent sharing with yourself
    if (sharedWithUserIds.includes(userId)) {
      return { success: false, error: "You cannot share topics with yourself" };
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const topicsCollection = db.collection("topics");
    const usersCollection = db.collection("users");
    const sharedTopicsCollection = db.collection("sharedTopics");
    const friendRequestsCollection = db.collection("friendRequests");

    // Verify all recipients are friends
    const friendships = await friendRequestsCollection
      .find({
        $or: [
          { from: new ObjectId(userId), to: { $in: sharedWithUserIds.map((id) => new ObjectId(id)) }, status: "accepted" },
          { to: new ObjectId(userId), from: { $in: sharedWithUserIds.map((id) => new ObjectId(id)) }, status: "accepted" },
        ],
      })
      .toArray();

    const friendIds = new Set(
      friendships.map((f) =>
        f.from.toString() === userId ? f.to.toString() : f.from.toString()
      )
    );

    const nonFriendIds = sharedWithUserIds.filter((id) => !friendIds.has(id));
    if (nonFriendIds.length > 0) {
      return { success: false, error: "You can only share topics with your friends" };
    }

    // Verify all topics belong to the current user
    const topics = await topicsCollection
      .find({
        _id: { $in: topicIds.map((id) => new ObjectId(id)) },
        userId: new ObjectId(userId),
      })
      .toArray();

    if (topics.length !== topicIds.length) {
      return { success: false, error: "Some topics not found or you don't have permission" };
    }

    // Verify all users exist
    const sharedWithUsers = await usersCollection
      .find({
        _id: { $in: sharedWithUserIds.map((id) => new ObjectId(id)) },
      })
      .toArray();

    if (sharedWithUsers.length !== sharedWithUserIds.length) {
      return { success: false, error: "Some users not found" };
    }

    // Get sharer info
    const sharer = await usersCollection.findOne({ _id: new ObjectId(userId) });
    const sharedByName = sharer?.name || sharer?.email || "Unknown";

    // Create shared topic entries for each recipient
    const sharedWithNames: { [userId: string]: string } = {};
    sharedWithUsers.forEach((user) => {
      sharedWithNames[user._id.toString()] = user.name || user.email;
    });

    // Create or update shared topic record for each recipient
    const sharePromises = sharedWithUserIds.map(async (recipientId) => {
      // Check if there's an existing share from this user to this recipient
      const existingShare = await sharedTopicsCollection.findOne({
        sharedBy: new ObjectId(userId),
        sharedWith: new ObjectId(recipientId),
      });

      if (existingShare) {
        // Update existing share - add new topic IDs if not already present
        const existingTopicIds = (existingShare.topicIds || []).map((id: ObjectId) => id.toString());
        const newTopicIds = Array.from(new Set([...existingTopicIds, ...topicIds]));
        
        await sharedTopicsCollection.updateOne(
          { _id: existingShare._id },
          {
            $set: {
              topicIds: newTopicIds.map((id) => new ObjectId(id)),
              updatedAt: new Date(),
            },
          }
        );
      } else {
        // Create new share
        await sharedTopicsCollection.insertOne({
          sharedBy: new ObjectId(userId),
          sharedByName,
          sharedWith: new ObjectId(recipientId),
          topicIds: topicIds.map((id) => new ObjectId(id)),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    });

    await Promise.all(sharePromises);

    // Send email notifications to recipients
    const topicTitles = topics.map((t) => t.title);
    const emailPromises = sharedWithUsers.map(async (user) => {
      try {
        await sendTopicSharedEmail(
          user.email,
          user.name || user.email,
          sharedByName,
          topicTitles
        );
      } catch (error) {
        console.error(`Failed to send topic share email to ${user.email}:`, error);
      }
    });
    
    // Don't wait for emails to complete - send in background
    Promise.all(emailPromises).catch(console.error);

    revalidatePath("/topics");
    revalidatePath("/shared-topics");
    return { success: true };
  } catch (error) {
    console.error("Error sharing topics:", error);
    return { success: false, error: "Failed to share topics" };
  }
}

// GET SHARED TOPICS - Get topics shared with current user (only from friends)
export async function getSharedTopics(): Promise<SharedTopic[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return [];
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const sharedTopicsCollection = db.collection("sharedTopics");
    const topicsCollection = db.collection("topics");
    const usersCollection = db.collection("users");
    const friendRequestsCollection = db.collection("friendRequests");

    // Get all friends
    const friendships = await friendRequestsCollection
      .find({
        $or: [
          { from: new ObjectId(userId), status: "accepted" },
          { to: new ObjectId(userId), status: "accepted" },
        ],
      })
      .toArray();

    const friendIds = friendships.map((f) =>
      f.from.toString() === userId ? f.to.toString() : f.from.toString()
    );

    if (friendIds.length === 0) {
      return [];
    }

    // Find all shares where current user is the recipient AND sharer is a friend
    const sharedTopics = await sharedTopicsCollection
      .find({
        sharedWith: new ObjectId(userId),
        sharedBy: { $in: friendIds.map((id) => new ObjectId(id)) },
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Populate topic data and sharer info
    const populatedShares = await Promise.all(
      sharedTopics.map(async (share) => {
        // Get topic data
        const topicIds = (share.topicIds || []).map((id: ObjectId) => id.toString());
        const topics = await topicsCollection
          .find({
            _id: { $in: share.topicIds || [] },
          })
          .toArray();

        const topicData = topics.map((topic) => ({
          _id: topic._id.toString(),
          title: topic.title,
          description: topic.description || "",
          linkedTopics: (topic.linkedTopics || []).map((id: ObjectId) => id.toString()),
          parentTopicId: topic.parentTopicId?.toString(),
          createdAt: topic.createdAt,
          updatedAt: topic.updatedAt,
        }));

        return {
          _id: share._id.toString(),
          sharedBy: share.sharedBy.toString(),
          sharedByName: share.sharedByName || "Unknown",
          sharedWith: [share.sharedWith.toString()],
          topicIds,
          topics: topicData,
          createdAt: share.createdAt,
        };
      })
    );

    return populatedShares;
  } catch (error) {
    console.error("Error fetching shared topics:", error);
    return [];
  }
}

// GET SHARED TOPICS BY ME - Get topics I've shared
export async function getSharedTopicsByMe(): Promise<SharedTopic[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return [];
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const sharedTopicsCollection = db.collection("sharedTopics");
    const topicsCollection = db.collection("topics");
    const usersCollection = db.collection("users");

    // Find all shares where current user is the sharer
    const sharedTopics = await sharedTopicsCollection
      .find({
        sharedBy: new ObjectId(userId),
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Populate topic data and recipient info
    const populatedShares = await Promise.all(
      sharedTopics.map(async (share) => {
        // Get topic data
        const topics = await topicsCollection
          .find({
            _id: { $in: share.topicIds || [] },
          })
          .toArray();

        const topicData = topics.map((topic) => ({
          _id: topic._id.toString(),
          title: topic.title,
          description: topic.description || "",
          linkedTopics: (topic.linkedTopics || []).map((id: ObjectId) => id.toString()),
          parentTopicId: topic.parentTopicId?.toString(),
          createdAt: topic.createdAt,
          updatedAt: topic.updatedAt,
        }));

        // Get recipient info
        const recipient = await usersCollection.findOne({ _id: share.sharedWith });
        const recipientName = recipient?.name || recipient?.email || "Unknown";

        return {
          _id: share._id.toString(),
          sharedBy: share.sharedBy.toString(),
          sharedByName: share.sharedByName || "Unknown",
          sharedWith: [share.sharedWith.toString()],
          sharedWithNames: { [share.sharedWith.toString()]: recipientName },
          topicIds: (share.topicIds || []).map((id: ObjectId) => id.toString()),
          topics: topicData,
          createdAt: share.createdAt,
        };
      })
    );

    return populatedShares;
  } catch (error) {
    console.error("Error fetching shared topics by me:", error);
    return [];
  }
}

// ========== NOTES CRUD OPERATIONS ==========

export interface Note {
  _id?: string;
  title: string;
  content: string;
  summary?: string;
  transcription?: string;
  topicId?: string;
  userId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// CREATE - Add a new note
export async function createNote(formData: FormData) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const collection = db.collection("notes");

    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const summary = formData.get("summary") as string;
    const transcription = formData.get("transcription") as string;
    const topicId = formData.get("topicId") as string;

    if (!title || title.trim() === "") {
      return { success: false, error: "Title is required" };
    }

    const newNote: any = {
      title: title.trim(),
      content: content?.trim() || "",
      summary: summary?.trim() || "",
      transcription: transcription?.trim() || "",
      userId: new ObjectId(userId),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (topicId && topicId.trim() !== "") {
      newNote.topicId = topicId.trim();
    }

    const result = await collection.insertOne(newNote);
    revalidatePath("/audio-notes");
    return { success: true, id: result.insertedId.toString() };
  } catch (error) {
    console.error("Error creating note:", error);
    return { success: false, error: "Failed to create note" };
  }
}

// READ - Get all notes
export async function getNotes(): Promise<Note[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return [];
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const collection = db.collection("notes");

    const notes = await collection
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();

    return notes.map((note) => ({
      _id: note._id.toString(),
      title: note.title,
      content: note.content || "",
      summary: note.summary || "",
      transcription: note.transcription || "",
      topicId: note.topicId?.toString(),
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    }));
  } catch (error) {
    console.error("Error fetching notes:", error);
    return [];
  }
}

// READ - Get a single note by ID
export async function getNote(noteId: string): Promise<Note | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return null;
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const collection = db.collection("notes");

    const note = await collection.findOne({
      _id: new ObjectId(noteId),
      userId: new ObjectId(userId),
    });

    if (!note) {
      return null;
    }

    return {
      _id: note._id.toString(),
      title: note.title,
      content: note.content || "",
      summary: note.summary || "",
      transcription: note.transcription || "",
      topicId: note.topicId?.toString(),
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };
  } catch (error) {
    console.error("Error fetching note:", error);
    return null;
  }
}

// UPDATE - Update a note
export async function updateNote(noteId: string, formData: FormData) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const collection = db.collection("notes");

    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const summary = formData.get("summary") as string;
    const topicId = formData.get("topicId") as string;

    if (!title || title.trim() === "") {
      return { success: false, error: "Title is required" };
    }

    const updateData: any = {
      title: title.trim(),
      content: content?.trim() || "",
      summary: summary?.trim() || "",
      updatedAt: new Date(),
    };

    if (topicId && topicId.trim() !== "") {
      updateData.topicId = topicId.trim();
    } else {
      updateData.topicId = null;
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(noteId), userId: new ObjectId(userId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return { success: false, error: "Note not found" };
    }

    revalidatePath("/audio-notes");
    return { success: true };
  } catch (error) {
    console.error("Error updating note:", error);
    return { success: false, error: "Failed to update note" };
  }
}

// DELETE - Delete a note
export async function deleteNote(noteId: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const collection = db.collection("notes");

    const result = await collection.deleteOne({
      _id: new ObjectId(noteId),
      userId: new ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      return { success: false, error: "Note not found" };
    }

    revalidatePath("/audio-notes");
    return { success: true };
  } catch (error) {
    console.error("Error deleting note:", error);
    return { success: false, error: "Failed to delete note" };
  }
}

// ========== FRIEND REQUEST OPERATIONS ==========

export interface FriendRequest {
  _id?: string;
  from: string; // User ID who sent the request
  fromName?: string; // Name of user who sent the request
  to: string; // User ID who received the request
  toName?: string; // Name of user who received the request
  status: "pending" | "accepted" | "rejected";
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Friend {
  _id: string;
  email: string;
  name: string;
  friendshipId: string; // ID of the friend request document
}

// SEND FRIEND REQUEST - Send a friend request to another user
export async function sendFriendRequest(toUserId: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    if (userId === toUserId) {
      return { success: false, error: "You cannot send a friend request to yourself" };
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const friendRequestsCollection = db.collection("friendRequests");
    const usersCollection = db.collection("users");

    // Check if users exist
    const [fromUser, toUser] = await Promise.all([
      usersCollection.findOne({ _id: new ObjectId(userId) }),
      usersCollection.findOne({ _id: new ObjectId(toUserId) }),
    ]);

    if (!fromUser || !toUser) {
      return { success: false, error: "User not found" };
    }

    // Check if there's already a pending or accepted request
    const existingRequest = await friendRequestsCollection.findOne({
      $or: [
        { from: new ObjectId(userId), to: new ObjectId(toUserId) },
        { from: new ObjectId(toUserId), to: new ObjectId(userId) },
      ],
      status: { $in: ["pending", "accepted"] },
    });

    if (existingRequest) {
      if (existingRequest.status === "accepted") {
        return { success: false, error: "You are already friends with this user" };
      }
      if (existingRequest.status === "pending") {
        if (existingRequest.from.toString() === userId) {
          return { success: false, error: "Friend request already sent" };
        } else {
          return { success: false, error: "This user has already sent you a friend request" };
        }
      }
    }

    // Create friend request
    await friendRequestsCollection.insertOne({
      from: new ObjectId(userId),
      fromName: fromUser.name || fromUser.email,
      to: new ObjectId(toUserId),
      toName: toUser.name || toUser.email,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Send email notification to recipient (in background)
    sendFriendRequestEmail(
      toUser.email,
      toUser.name || toUser.email,
      fromUser.name || fromUser.email
    ).catch((error) => {
      console.error("Failed to send friend request email:", error);
    });

    revalidatePath("/friends");
    return { success: true };
  } catch (error) {
    console.error("Error sending friend request:", error);
    return { success: false, error: "Failed to send friend request" };
  }
}

// ACCEPT FRIEND REQUEST - Accept a friend request
export async function acceptFriendRequest(requestId: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const friendRequestsCollection = db.collection("friendRequests");

    // Find the request where current user is the recipient
    const request = await friendRequestsCollection.findOne({
      _id: new ObjectId(requestId),
      to: new ObjectId(userId),
      status: "pending",
    });

    if (!request) {
      return { success: false, error: "Friend request not found or already processed" };
    }

    // Update request status to accepted
    await friendRequestsCollection.updateOne(
      { _id: new ObjectId(requestId) },
      {
        $set: {
          status: "accepted",
          updatedAt: new Date(),
        },
      }
    );

    revalidatePath("/friends");
    return { success: true };
  } catch (error) {
    console.error("Error accepting friend request:", error);
    return { success: false, error: "Failed to accept friend request" };
  }
}

// REJECT FRIEND REQUEST - Reject a friend request
export async function rejectFriendRequest(requestId: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const friendRequestsCollection = db.collection("friendRequests");

    // Find the request where current user is the recipient
    const request = await friendRequestsCollection.findOne({
      _id: new ObjectId(requestId),
      to: new ObjectId(userId),
      status: "pending",
    });

    if (!request) {
      return { success: false, error: "Friend request not found or already processed" };
    }

    // Update request status to rejected
    await friendRequestsCollection.updateOne(
      { _id: new ObjectId(requestId) },
      {
        $set: {
          status: "rejected",
          updatedAt: new Date(),
        },
      }
    );

    revalidatePath("/friends");
    return { success: true };
  } catch (error) {
    console.error("Error rejecting friend request:", error);
    return { success: false, error: "Failed to reject friend request" };
  }
}

// REMOVE FRIEND - Remove a friend (delete the friendship)
export async function removeFriend(friendId: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const friendRequestsCollection = db.collection("friendRequests");

    // Find the friendship (either direction)
    const friendship = await friendRequestsCollection.findOne({
      $or: [
        { from: new ObjectId(userId), to: new ObjectId(friendId), status: "accepted" },
        { from: new ObjectId(friendId), to: new ObjectId(userId), status: "accepted" },
      ],
    });

    if (!friendship) {
      return { success: false, error: "Friendship not found" };
    }

    // Delete the friendship
    await friendRequestsCollection.deleteOne({ _id: friendship._id });

    // Also remove any shared topics between these users
    const sharedTopicsCollection = db.collection("sharedTopics");
    await sharedTopicsCollection.deleteMany({
      $or: [
        { sharedBy: new ObjectId(userId), sharedWith: new ObjectId(friendId) },
        { sharedBy: new ObjectId(friendId), sharedWith: new ObjectId(userId) },
      ],
    });

    revalidatePath("/friends");
    revalidatePath("/shared-topics");
    return { success: true };
  } catch (error) {
    console.error("Error removing friend:", error);
    return { success: false, error: "Failed to remove friend" };
  }
}

// GET FRIENDS - Get all friends of current user
export async function getFriends(): Promise<Friend[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return [];
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const friendRequestsCollection = db.collection("friendRequests");
    const usersCollection = db.collection("users");

    // Find all accepted friend requests where user is involved
    const friendships = await friendRequestsCollection
      .find({
        $or: [
          { from: new ObjectId(userId), status: "accepted" },
          { to: new ObjectId(userId), status: "accepted" },
        ],
      })
      .toArray();

    // Get friend user IDs
    const friendIds = friendships.map((friendship) => {
      if (friendship.from.toString() === userId) {
        return friendship.to.toString();
      }
      return friendship.from.toString();
    });

    if (friendIds.length === 0) {
      return [];
    }

    // Get friend user details
    const friends = await usersCollection
      .find({
        _id: { $in: friendIds.map((id) => new ObjectId(id)) },
      })
      .toArray();

    // Map to Friend interface
    return friends.map((friend) => {
      const friendship = friendships.find(
        (f) =>
          f.from.toString() === friend._id.toString() ||
          f.to.toString() === friend._id.toString()
      );
      return {
        _id: friend._id.toString(),
        email: friend.email,
        name: friend.name || friend.email,
        friendshipId: friendship?._id.toString() || "",
      };
    });
  } catch (error) {
    console.error("Error fetching friends:", error);
    return [];
  }
}

// GET PENDING FRIEND REQUESTS - Get pending requests sent to and received by current user
export async function getPendingFriendRequests(): Promise<{
  sent: FriendRequest[];
  received: FriendRequest[];
}> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { sent: [], received: [] };
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const friendRequestsCollection = db.collection("friendRequests");

    // Get requests sent by current user
    const sentRequests = await friendRequestsCollection
      .find({
        from: new ObjectId(userId),
        status: "pending",
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Get requests received by current user
    const receivedRequests = await friendRequestsCollection
      .find({
        to: new ObjectId(userId),
        status: "pending",
      })
      .sort({ createdAt: -1 })
      .toArray();

    return {
      sent: sentRequests.map((req) => ({
        _id: req._id.toString(),
        from: req.from.toString(),
        fromName: req.fromName,
        to: req.to.toString(),
        toName: req.toName,
        status: req.status,
        createdAt: req.createdAt,
        updatedAt: req.updatedAt,
      })),
      received: receivedRequests.map((req) => ({
        _id: req._id.toString(),
        from: req.from.toString(),
        fromName: req.fromName,
        to: req.to.toString(),
        toName: req.toName,
        status: req.status,
        createdAt: req.createdAt,
        updatedAt: req.updatedAt,
      })),
    };
  } catch (error) {
    console.error("Error fetching pending friend requests:", error);
    return { sent: [], received: [] };
  }
}

// SEARCH USERS - Search for users by email or name (for sending friend requests)
export async function searchUsers(query: string): Promise<User[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return [];
    }

    if (!query || query.trim().length < 2) {
      return [];
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const usersCollection = db.collection("users");
    const friendRequestsCollection = db.collection("friendRequests");

    // Search users by email or name
    const searchRegex = new RegExp(query.trim(), "i");
    const users = await usersCollection
      .find({
        _id: { $ne: new ObjectId(userId) },
        $or: [
          { email: searchRegex },
          { name: searchRegex },
        ],
      })
      .limit(10)
      .toArray();

    // Get current user's friends and pending requests
    const [friendships, pendingRequests] = await Promise.all([
      friendRequestsCollection
        .find({
          $or: [
            { from: new ObjectId(userId), status: "accepted" },
            { to: new ObjectId(userId), status: "accepted" },
          ],
        })
        .toArray(),
      friendRequestsCollection
        .find({
          $or: [
            { from: new ObjectId(userId), status: "pending" },
            { to: new ObjectId(userId), status: "pending" },
          ],
        })
        .toArray(),
    ]);

    const friendIds = new Set(
      friendships.map((f) =>
        f.from.toString() === userId ? f.to.toString() : f.from.toString()
      )
    );
    const pendingIds = new Set(
      pendingRequests.map((f) =>
        f.from.toString() === userId ? f.to.toString() : f.from.toString()
      )
    );

    return users.map((user) => ({
      _id: user._id.toString(),
      email: user.email,
      name: user.name || user.email,
    }));
  } catch (error) {
    console.error("Error searching users:", error);
    return [];
  }
}

// ========== FAMILY OPERATIONS ==========

export interface Family {
  _id: string;
  name: string;
  members: { userId: string; name: string; email: string }[];
  createdBy: string;
  createdAt?: Date;
}

export async function createFamily(name: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: "Unauthorized" };

    const trimmedName = name.trim();
    if (!trimmedName) return { success: false, error: "Family name is required" };

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const familiesCollection = db.collection("families");
    const usersCollection = db.collection("users");

    const creator = await usersCollection.findOne({ _id: new ObjectId(userId) });
    if (!creator) return { success: false, error: "User not found" };

    const result = await familiesCollection.insertOne({
      name: trimmedName,
      members: [new ObjectId(userId)],
      createdBy: new ObjectId(userId),
      createdAt: new Date(),
    });

    revalidatePath("/families");
    revalidatePath("/inventory");
    return { success: true, id: result.insertedId.toString() };
  } catch (error) {
    console.error("Error creating family:", error);
    return { success: false, error: "Failed to create family" };
  }
}

export async function getFamilies(): Promise<Family[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const familiesCollection = db.collection("families");
    const usersCollection = db.collection("users");

    const families = await familiesCollection
      .find({ members: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();

    const result: Family[] = [];
    for (const fam of families) {
      const memberIds = (fam.members || []).map((m: ObjectId) => m.toString());
      const users = await usersCollection
        .find({ _id: { $in: fam.members } })
        .toArray();
      const memberDetails = users.map((u: any) => ({
        userId: u._id.toString(),
        name: u.name || u.email,
        email: u.email,
      }));
      result.push({
        _id: fam._id.toString(),
        name: fam.name,
        members: memberDetails,
        createdBy: fam.createdBy.toString(),
        createdAt: fam.createdAt,
      });
    }
    return result;
  } catch (error) {
    console.error("Error fetching families:", error);
    return [];
  }
}

export async function addMemberToFamily(familyId: string, userId: string) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) return { success: false, error: "Unauthorized" };

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const familiesCollection = db.collection("families");

    const family = await familiesCollection.findOne({
      _id: new ObjectId(familyId),
      members: new ObjectId(currentUserId),
    });
    if (!family) return { success: false, error: "Family not found or access denied" };

    const newMemberId = new ObjectId(userId);
    if (family.members.some((m: ObjectId) => m.equals(newMemberId))) {
      return { success: false, error: "User is already in this family" };
    }

    await familiesCollection.updateOne(
      { _id: new ObjectId(familyId) },
      { $addToSet: { members: newMemberId } }
    );

    revalidatePath("/families");
    revalidatePath("/inventory");
    return { success: true };
  } catch (error) {
    console.error("Error adding family member:", error);
    return { success: false, error: "Failed to add member" };
  }
}

export async function removeMemberFromFamily(familyId: string, userId: string) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) return { success: false, error: "Unauthorized" };

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const familiesCollection = db.collection("families");

    const family = await familiesCollection.findOne({
      _id: new ObjectId(familyId),
      members: new ObjectId(currentUserId),
    });
    if (!family) return { success: false, error: "Family not found or access denied" };

    // Only creator or the member themselves can remove
    const isCreator = family.createdBy.toString() === currentUserId;
    const isLeavingSelf = userId === currentUserId;
    if (!isCreator && !isLeavingSelf) {
      return { success: false, error: "Only the family creator can remove members" };
    }

    await familiesCollection.updateOne(
      { _id: new ObjectId(familyId) },
      { $pull: { members: new ObjectId(userId) } } as any
    );

    // If family has no members left, delete it
    const updated = await familiesCollection.findOne({ _id: new ObjectId(familyId) });
    if (updated && (!updated.members || updated.members.length === 0)) {
      await familiesCollection.deleteOne({ _id: new ObjectId(familyId) });
    }

    revalidatePath("/families");
    revalidatePath("/inventory");
    return { success: true };
  } catch (error) {
    console.error("Error removing family member:", error);
    return { success: false, error: "Failed to remove member" };
  }
}

export async function isUserInFamily(familyId: string, userId: string): Promise<boolean> {
  try {
    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const family = await db.collection("families").findOne({
      _id: new ObjectId(familyId),
      members: new ObjectId(userId),
    });
    return !!family;
  } catch {
    return false;
  }
}

// ========== ADMIN OPERATIONS ==========

// Admin emails - users with these emails have admin access
const ADMIN_EMAILS = [
  process.env.ADMIN_EMAIL || "admin@example.com",
];

// Check if current user is an admin
export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return false;
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return false;
    }

    // Check if user is admin by email or isAdmin flag
    return ADMIN_EMAILS.includes(user.email) || user.isAdmin === true;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

// Admin user interface with more details
export interface AdminUser {
  _id: string;
  email: string;
  name: string;
  provider?: string;
  emailVerified?: boolean;
  createdAt?: Date;
  lastLoginAt?: Date;
  isAdmin?: boolean;
  topicsCount?: number;
  notesCount?: number;
  tasksCount?: number;
}

// Get all users for admin (with stats)
export async function getAllUsersForAdmin(): Promise<AdminUser[]> {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      console.log("User is not an admin, returning empty array");
      return [];
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const usersCollection = db.collection("users");
    const topicsCollection = db.collection("topics");
    const notesCollection = db.collection("notes");
    const tasksCollection = db.collection("tasks");

    const users = await usersCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Get counts for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const [topicsCount, notesCount, tasksCount] = await Promise.all([
          topicsCollection.countDocuments({ userId: user._id }),
          notesCollection.countDocuments({ userId: user._id }),
          tasksCollection.countDocuments({
            $or: [
              { userId: user._id },
              { createdBy: user._id },
            ],
          }),
        ]);

        return {
          _id: user._id.toString(),
          email: user.email,
          name: user.name || user.email,
          provider: user.provider,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          isAdmin: ADMIN_EMAILS.includes(user.email) || user.isAdmin === true,
          topicsCount,
          notesCount,
          tasksCount,
        };
      })
    );

    return usersWithStats;
  } catch (error) {
    console.error("Error fetching users for admin:", error);
    return [];
  }
}

// Get admin dashboard stats
export async function getAdminStats(): Promise<{
  totalUsers: number;
  verifiedUsers: number;
  totalTopics: number;
  totalNotes: number;
  totalTasks: number;
  recentUsers: AdminUser[];
}> {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return {
        totalUsers: 0,
        verifiedUsers: 0,
        totalTopics: 0,
        totalNotes: 0,
        totalTasks: 0,
        recentUsers: [],
      };
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const usersCollection = db.collection("users");
    const topicsCollection = db.collection("topics");
    const notesCollection = db.collection("notes");
    const tasksCollection = db.collection("tasks");

    const [totalUsers, verifiedUsers, totalTopics, totalNotes, totalTasks, recentUsersData] = await Promise.all([
      usersCollection.countDocuments({}),
      usersCollection.countDocuments({ emailVerified: true }),
      topicsCollection.countDocuments({}),
      notesCollection.countDocuments({}),
      tasksCollection.countDocuments({}),
      usersCollection.find({}).sort({ createdAt: -1 }).limit(5).toArray(),
    ]);

    const recentUsers: AdminUser[] = recentUsersData.map((user) => ({
      _id: user._id.toString(),
      email: user.email,
      name: user.name || user.email,
      provider: user.provider,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      isAdmin: ADMIN_EMAILS.includes(user.email) || user.isAdmin === true,
    }));

    return {
      totalUsers,
      verifiedUsers,
      totalTopics,
      totalNotes,
      totalTasks,
      recentUsers,
    };
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return {
      totalUsers: 0,
      verifiedUsers: 0,
      totalTopics: 0,
      totalNotes: 0,
      totalTasks: 0,
      recentUsers: [],
    };
  }
}

// Toggle user admin status
export async function toggleUserAdmin(targetUserId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { success: false, error: "Unauthorized" };
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const usersCollection = db.collection("users");

    const targetUser = await usersCollection.findOne({ _id: new ObjectId(targetUserId) });
    if (!targetUser) {
      return { success: false, error: "User not found" };
    }

    // Toggle the isAdmin flag
    const newAdminStatus = !targetUser.isAdmin;
    await usersCollection.updateOne(
      { _id: new ObjectId(targetUserId) },
      { $set: { isAdmin: newAdminStatus, updatedAt: new Date() } }
    );

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Error toggling user admin status:", error);
    return { success: false, error: "Failed to update admin status" };
  }
}

// ========== PASSWORD RESET OPERATIONS ==========

// REQUEST PASSWORD RESET - Generate a reset token for a user
export async function requestPasswordReset(email: string) {
  try {
    if (!email || email.trim() === "") {
      return { success: false, error: "Email is required" };
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const usersCollection = db.collection("users");
    const passwordResetsCollection = db.collection("passwordResets");

    // Find user by email
    const user = await usersCollection.findOne({
      email: email.trim().toLowerCase(),
    });

    // Always return success to prevent email enumeration
    // In production, you would send an email here
    if (!user) {
      return { success: false, message: "If an account exists with this email, a password reset link has been sent." };
    }

    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    // Store reset token
    await passwordResetsCollection.insertOne({
      userId: user._id,
      token: resetToken,
      expiresAt,
      createdAt: new Date(),
      used: false,
    });

    // Send email with reset link
    const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;
    
    try {
      const emailSent = await sendPasswordResetEmail(
        user.email,
        resetUrl,
        resetToken
      );

      if (!emailSent) {
        console.error("Failed to send password reset email");
        // Still return success to prevent email enumeration
        return {
          success: true,
          message: "If an account exists with this email, a password reset link has been sent.",
        };
      }
    } catch (error) {
      console.error("Error sending password reset email:", error);
      // Still return success to prevent email enumeration
      return {
        success: true,
        message: "If an account exists with this email, a password reset link has been sent.",
      };
    }

    return {
      success: true,
      message: "Password reset link has been sent to your email address.",
    };
  } catch (error) {
    console.error("Error requesting password reset:", error);
    return { success: false, error: "Failed to process password reset request" };
  }
}

// RESET PASSWORD - Reset password using a valid token
export async function resetPassword(token: string, newPassword: string) {
  try {
    if (!token || token.trim() === "") {
      return { success: false, error: "Reset token is required" };
    }

    if (!newPassword || newPassword.trim().length < 6) {
      return { success: false, error: "Password must be at least 6 characters long" };
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const passwordResetsCollection = db.collection("passwordResets");
    const usersCollection = db.collection("users");

    // Find valid reset token
    const resetRequest = await passwordResetsCollection.findOne({
      token: token.trim(),
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetRequest) {
      return { success: false, error: "Invalid or expired reset token" };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

    // Update user password
    await usersCollection.updateOne(
      { _id: resetRequest.userId },
      { $set: { password: hashedPassword } }
    );

    // Mark token as used
    await passwordResetsCollection.updateOne(
      { _id: resetRequest._id },
      { $set: { used: true, usedAt: new Date() } }
    );

    return { success: true, message: "Password reset successfully" };
  } catch (error) {
    console.error("Error resetting password:", error);
    return { success: false, error: "Failed to reset password" };
  }
}

// ================== BLOG POSTS ==================

// CREATE - Create a new blog post
export async function createBlogPost(formData: FormData) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const blogsCollection = db.collection("blogs");
    const usersCollection = db.collection("users");

    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const excerpt = formData.get("excerpt") as string;
    const coverImage = formData.get("coverImage") as string;
    const tagsStr = formData.get("tags") as string;
    const published = formData.get("published") === "true";

    if (!title || title.trim() === "") {
      return { success: false, error: "Title is required" };
    }

    if (!content || content.trim() === "") {
      return { success: false, error: "Content is required" };
    }

    // Get author info
    const author = await usersCollection.findOne({ _id: new ObjectId(userId) });
    const authorName = author?.name || author?.email || "Unknown";
    const authorEmail = author?.email || "";

    // Parse tags
    const tags = tagsStr ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean) : [];

    // Generate excerpt if not provided
    const autoExcerpt = excerpt?.trim() || content.replace(/<[^>]*>/g, "").slice(0, 200) + "...";

    const newPost: any = {
      title: title.trim(),
      content: content.trim(),
      excerpt: autoExcerpt,
      coverImage: coverImage?.trim() || null,
      published,
      authorId: new ObjectId(userId),
      authorName,
      authorEmail,
      tags,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (published) {
      newPost.publishedAt = new Date();
    }

    const result = await blogsCollection.insertOne(newPost);

    revalidatePath("/");
    revalidatePath("/blog");
    return { success: true, id: result.insertedId.toString() };
  } catch (error) {
    console.error("Error creating blog post:", error);
    return { success: false, error: "Failed to create blog post" };
  }
}

// READ - Get all published blog posts (for public display)
export async function getPublishedBlogPosts(): Promise<BlogPost[]> {
  try {
    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const blogsCollection = db.collection("blogs");

    const posts = await blogsCollection
      .find({ published: true })
      .sort({ publishedAt: -1, createdAt: -1 })
      .toArray();

    return posts.map((post) => ({
      _id: post._id.toString(),
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      coverImage: post.coverImage,
      published: post.published,
      authorId: post.authorId?.toString(),
      authorName: post.authorName,
      authorEmail: post.authorEmail,
      tags: post.tags || [],
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      publishedAt: post.publishedAt,
    }));
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    return [];
  }
}

// READ - Get user's blog posts (for management)
export async function getUserBlogPosts(): Promise<BlogPost[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return [];
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const blogsCollection = db.collection("blogs");

    const posts = await blogsCollection
      .find({ authorId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();

    return posts.map((post) => ({
      _id: post._id.toString(),
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      coverImage: post.coverImage,
      published: post.published,
      authorId: post.authorId?.toString(),
      authorName: post.authorName,
      authorEmail: post.authorEmail,
      tags: post.tags || [],
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      publishedAt: post.publishedAt,
    }));
  } catch (error) {
    console.error("Error fetching user blog posts:", error);
    return [];
  }
}

// READ - Get single blog post by ID
export async function getBlogPost(postId: string): Promise<BlogPost | null> {
  try {
    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const blogsCollection = db.collection("blogs");

    const post = await blogsCollection.findOne({ _id: new ObjectId(postId) });

    if (!post) {
      return null;
    }

    return {
      _id: post._id.toString(),
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      coverImage: post.coverImage,
      published: post.published,
      authorId: post.authorId?.toString(),
      authorName: post.authorName,
      authorEmail: post.authorEmail,
      tags: post.tags || [],
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      publishedAt: post.publishedAt,
    };
  } catch (error) {
    console.error("Error fetching blog post:", error);
    return null;
  }
}

// UPDATE - Update a blog post
export async function updateBlogPost(postId: string, formData: FormData) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const blogsCollection = db.collection("blogs");

    // Check ownership
    const existingPost = await blogsCollection.findOne({ _id: new ObjectId(postId) });
    if (!existingPost) {
      return { success: false, error: "Blog post not found" };
    }

    if (existingPost.authorId?.toString() !== userId) {
      return { success: false, error: "You can only edit your own posts" };
    }

    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const excerpt = formData.get("excerpt") as string;
    const coverImage = formData.get("coverImage") as string;
    const tagsStr = formData.get("tags") as string;
    const published = formData.get("published") === "true";

    if (!title || title.trim() === "") {
      return { success: false, error: "Title is required" };
    }

    if (!content || content.trim() === "") {
      return { success: false, error: "Content is required" };
    }

    // Parse tags
    const tags = tagsStr ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean) : [];

    // Generate excerpt if not provided
    const autoExcerpt = excerpt?.trim() || content.replace(/<[^>]*>/g, "").slice(0, 200) + "...";

    const updateData: any = {
      title: title.trim(),
      content: content.trim(),
      excerpt: autoExcerpt,
      coverImage: coverImage?.trim() || null,
      published,
      tags,
      updatedAt: new Date(),
    };

    // Set publishedAt if publishing for the first time
    if (published && !existingPost.publishedAt) {
      updateData.publishedAt = new Date();
    }

    await blogsCollection.updateOne(
      { _id: new ObjectId(postId) },
      { $set: updateData }
    );

    revalidatePath("/");
    revalidatePath("/blog");
    return { success: true };
  } catch (error) {
    console.error("Error updating blog post:", error);
    return { success: false, error: "Failed to update blog post" };
  }
}

// DELETE - Delete a blog post
export async function deleteBlogPost(postId: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const blogsCollection = db.collection("blogs");

    // Check ownership
    const existingPost = await blogsCollection.findOne({ _id: new ObjectId(postId) });
    if (!existingPost) {
      return { success: false, error: "Blog post not found" };
    }

    if (existingPost.authorId?.toString() !== userId) {
      return { success: false, error: "You can only delete your own posts" };
    }

    await blogsCollection.deleteOne({ _id: new ObjectId(postId) });

    revalidatePath("/");
    revalidatePath("/blog");
    return { success: true };
  } catch (error) {
    console.error("Error deleting blog post:", error);
    return { success: false, error: "Failed to delete blog post" };
  }
}
