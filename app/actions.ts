"use server";

import client from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";

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
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Topic {
  _id?: string;
  title: string;
  description: string;
  linkedTopics: string[]; // Array of topic IDs this topic is linked to
  parentTopicId?: string; // Optional parent for hierarchical display
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
      return { success: false, error: "User already exists" };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      email: email.trim(),
      password: hashedPassword,
      name: name?.trim() || email.trim(),
      createdAt: new Date(),
    };

    await usersCollection.insertOne(newUser);
    return { success: true };
  } catch (error) {
    console.error("Error registering user:", error);
    return { success: false, error: "Failed to register user" };
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

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;

    if (!title || title.trim() === "") {
      return { success: false, error: "Title is required" };
    }

    const newTask = {
      title: title.trim(),
      description: description?.trim() || "",
      completed: false,
      userId: new ObjectId(userId),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newTask);
    revalidatePath("/crud");
    return { success: true, id: result.insertedId.toString() };
  } catch (error) {
    console.error("Error creating task:", error);
    return { success: false, error: "Failed to create task" };
  }
}

// READ - Get all tasks
export async function getTasks(): Promise<Task[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return [];
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const collection = db.collection("tasks");

    const tasks = await collection
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();

    return tasks.map((task) => ({
      _id: task._id.toString(),
      title: task.title,
      description: task.description,
      completed: task.completed,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }));
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

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const completed = formData.get("completed") === "true";

    if (!title || title.trim() === "") {
      return { success: false, error: "Title is required" };
    }

    const updateData: any = {
      title: title.trim(),
      description: description?.trim() || "",
      completed,
      updatedAt: new Date(),
    };

    const result = await collection.updateOne(
      { _id: new ObjectId(taskId), userId: new ObjectId(userId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return { success: false, error: "Task not found" };
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

    const result = await collection.deleteOne({
      _id: new ObjectId(taskId),
      userId: new ObjectId(userId),
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

    const result = await collection.updateOne(
      { _id: new ObjectId(taskId), userId: new ObjectId(userId) },
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
