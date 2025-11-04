module.exports = [
"[externals]/mongodb [external] (mongodb, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("mongodb", () => require("mongodb"));

module.exports = mod;
}),
"[project]/denotesCRUD/lib/mongodb.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/mongodb [external] (mongodb, cjs)");
;
if (!process.env.MONGODB_URI) {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}
const uri = process.env.MONGODB_URI;
const options = {
    appName: "devrel.template.nextjs"
};
let client;
if ("TURBOPACK compile-time truthy", 1) {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    let globalWithMongo = /*TURBOPACK member replacement*/ __turbopack_context__.g;
    if (!globalWithMongo._mongoClient) {
        globalWithMongo._mongoClient = new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["MongoClient"](uri, options);
    }
    client = globalWithMongo._mongoClient;
} else //TURBOPACK unreachable
;
const __TURBOPACK__default__export__ = client;
}),
"[project]/denotesCRUD/app/actions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"00ac6ac639ff0576ee71cdb5403463dee6f270c51e":"getTasks","00b5db871c0010172d8cf564be84fea8c1aea291f1":"getTopics","00ce06ea6ea7e78d26705c7b11bbe248dd2eb43071":"testDatabaseConnection","408870d73fc9056cb4ab916de9bae5f56623b71d20":"createTask","408fb1708826857324fb2c89c2cae6175c7e991c69":"createTopic","4092ab85bf917b0e95604d88937da44e86b96f49d8":"deleteTopic","409c5c2a29ed84fd664c3adb5e83fa69411a59caa1":"deleteTask","40e0a8fb2ae6e652c233b71432bfe36271277bd0ec":"getTopic","6033e7acf12dcc200aa73db9bed08078be585348e0":"updateTopic","608d7fd3dca4c415421e58e681d8fe7d0b7f02917f":"unlinkTopics","60ae7fc0b06e3f8d85596e7dd3dcfdb01a4a8af60a":"linkTopics","60f43b2bb0e7f444097c8215eb7efbb0f1459e8d4b":"updateTask","60f80b6b518878b27e897712c8401ce95f5475b56b":"toggleTask"},"",""] */ __turbopack_context__.s([
    "createTask",
    ()=>createTask,
    "createTopic",
    ()=>createTopic,
    "deleteTask",
    ()=>deleteTask,
    "deleteTopic",
    ()=>deleteTopic,
    "getTasks",
    ()=>getTasks,
    "getTopic",
    ()=>getTopic,
    "getTopics",
    ()=>getTopics,
    "linkTopics",
    ()=>linkTopics,
    "testDatabaseConnection",
    ()=>testDatabaseConnection,
    "toggleTask",
    ()=>toggleTask,
    "unlinkTopics",
    ()=>unlinkTopics,
    "updateTask",
    ()=>updateTask,
    "updateTopic",
    ()=>updateTopic
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denotesCRUD/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$lib$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denotesCRUD/lib/mongodb.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/mongodb [external] (mongodb, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denotesCRUD/node_modules/next/cache.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denotesCRUD/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
;
async function testDatabaseConnection() {
    let isConnected = false;
    try {
        const mongoClient = await __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$lib$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].connect();
        // Send a ping to confirm a successful connection
        await mongoClient.db("admin").command({
            ping: 1
        });
        console.log("Pinged your deployment. You successfully connected to MongoDB!"); // because this is a server action, the console.log will be outputted to your terminal not in the browser
        return !isConnected;
    } catch (e) {
        console.error(e);
        return isConnected;
    }
}
async function createTask(formData) {
    try {
        const mongoClient = await __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$lib$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].connect();
        const db = mongoClient.db();
        const collection = db.collection("tasks");
        const title = formData.get("title");
        const description = formData.get("description");
        if (!title || title.trim() === "") {
            return {
                success: false,
                error: "Title is required"
            };
        }
        const newTask = {
            title: title.trim(),
            description: description?.trim() || "",
            completed: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const result = await collection.insertOne(newTask);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/crud");
        return {
            success: true,
            id: result.insertedId.toString()
        };
    } catch (error) {
        console.error("Error creating task:", error);
        return {
            success: false,
            error: "Failed to create task"
        };
    }
}
async function getTasks() {
    try {
        const mongoClient = await __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$lib$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].connect();
        const db = mongoClient.db();
        const collection = db.collection("tasks");
        const tasks = await collection.find({}).sort({
            createdAt: -1
        }).toArray();
        return tasks.map((task)=>({
                _id: task._id.toString(),
                title: task.title,
                description: task.description,
                completed: task.completed,
                createdAt: task.createdAt,
                updatedAt: task.updatedAt
            }));
    } catch (error) {
        console.error("Error fetching tasks:", error);
        return [];
    }
}
async function updateTask(taskId, formData) {
    try {
        const mongoClient = await __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$lib$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].connect();
        const db = mongoClient.db();
        const collection = db.collection("tasks");
        const title = formData.get("title");
        const description = formData.get("description");
        const completed = formData.get("completed") === "true";
        if (!title || title.trim() === "") {
            return {
                success: false,
                error: "Title is required"
            };
        }
        const updateData = {
            title: title.trim(),
            description: description?.trim() || "",
            completed,
            updatedAt: new Date()
        };
        const result = await collection.updateOne({
            _id: new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["ObjectId"](taskId)
        }, {
            $set: updateData
        });
        if (result.matchedCount === 0) {
            return {
                success: false,
                error: "Task not found"
            };
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/crud");
        return {
            success: true
        };
    } catch (error) {
        console.error("Error updating task:", error);
        return {
            success: false,
            error: "Failed to update task"
        };
    }
}
async function deleteTask(taskId) {
    try {
        const mongoClient = await __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$lib$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].connect();
        const db = mongoClient.db();
        const collection = db.collection("tasks");
        const result = await collection.deleteOne({
            _id: new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["ObjectId"](taskId)
        });
        if (result.deletedCount === 0) {
            return {
                success: false,
                error: "Task not found"
            };
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/crud");
        return {
            success: true
        };
    } catch (error) {
        console.error("Error deleting task:", error);
        return {
            success: false,
            error: "Failed to delete task"
        };
    }
}
async function toggleTask(taskId, completed) {
    try {
        const mongoClient = await __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$lib$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].connect();
        const db = mongoClient.db();
        const collection = db.collection("tasks");
        const result = await collection.updateOne({
            _id: new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["ObjectId"](taskId)
        }, {
            $set: {
                completed: !completed,
                updatedAt: new Date()
            }
        });
        if (result.matchedCount === 0) {
            return {
                success: false,
                error: "Task not found"
            };
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/crud");
        return {
            success: true
        };
    } catch (error) {
        console.error("Error toggling task:", error);
        return {
            success: false,
            error: "Failed to toggle task"
        };
    }
}
async function createTopic(formData) {
    try {
        const mongoClient = await __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$lib$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].connect();
        const db = mongoClient.db();
        const collection = db.collection("topics");
        const title = formData.get("title");
        const description = formData.get("description");
        const parentTopicId = formData.get("parentTopicId");
        if (!title || title.trim() === "") {
            return {
                success: false,
                error: "Title is required"
            };
        }
        const newTopic = {
            title: title.trim(),
            description: description?.trim() || "",
            linkedTopics: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        if (parentTopicId && parentTopicId.trim() !== "") {
            newTopic.parentTopicId = parentTopicId.trim();
        }
        const result = await collection.insertOne(newTopic);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/topics");
        return {
            success: true,
            id: result.insertedId.toString()
        };
    } catch (error) {
        console.error("Error creating topic:", error);
        return {
            success: false,
            error: "Failed to create topic"
        };
    }
}
async function getTopics() {
    try {
        const mongoClient = await __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$lib$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].connect();
        const db = mongoClient.db();
        const collection = db.collection("topics");
        const topics = await collection.find({}).sort({
            createdAt: -1
        }).toArray();
        return topics.map((topic)=>({
                _id: topic._id.toString(),
                title: topic.title,
                description: topic.description || "",
                linkedTopics: (topic.linkedTopics || []).map((id)=>id.toString()),
                parentTopicId: topic.parentTopicId?.toString(),
                createdAt: topic.createdAt,
                updatedAt: topic.updatedAt
            }));
    } catch (error) {
        console.error("Error fetching topics:", error);
        return [];
    }
}
async function getTopic(topicId) {
    try {
        const mongoClient = await __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$lib$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].connect();
        const db = mongoClient.db();
        const collection = db.collection("topics");
        const topic = await collection.findOne({
            _id: new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["ObjectId"](topicId)
        });
        if (!topic) {
            return null;
        }
        return {
            _id: topic._id.toString(),
            title: topic.title,
            description: topic.description || "",
            linkedTopics: (topic.linkedTopics || []).map((id)=>id.toString()),
            parentTopicId: topic.parentTopicId?.toString(),
            createdAt: topic.createdAt,
            updatedAt: topic.updatedAt
        };
    } catch (error) {
        console.error("Error fetching topic:", error);
        return null;
    }
}
async function updateTopic(topicId, formData) {
    try {
        const mongoClient = await __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$lib$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].connect();
        const db = mongoClient.db();
        const collection = db.collection("topics");
        const title = formData.get("title");
        const description = formData.get("description");
        const parentTopicId = formData.get("parentTopicId");
        if (!title || title.trim() === "") {
            return {
                success: false,
                error: "Title is required"
            };
        }
        const updateData = {
            title: title.trim(),
            description: description?.trim() || "",
            updatedAt: new Date()
        };
        if (parentTopicId && parentTopicId.trim() !== "" && parentTopicId !== topicId) {
            updateData.parentTopicId = parentTopicId.trim();
        } else if (parentTopicId === "") {
            updateData.parentTopicId = null;
        }
        const result = await collection.updateOne({
            _id: new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["ObjectId"](topicId)
        }, {
            $set: updateData
        });
        if (result.matchedCount === 0) {
            return {
                success: false,
                error: "Topic not found"
            };
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/topics");
        return {
            success: true
        };
    } catch (error) {
        console.error("Error updating topic:", error);
        return {
            success: false,
            error: "Failed to update topic"
        };
    }
}
async function deleteTopic(topicId) {
    try {
        const mongoClient = await __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$lib$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].connect();
        const db = mongoClient.db();
        const collection = db.collection("topics");
        // Remove topic from linkedTopics arrays of other topics
        await collection.updateMany({
            linkedTopics: new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["ObjectId"](topicId)
        }, {
            $pull: {
                linkedTopics: new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["ObjectId"](topicId)
            }
        });
        // Remove parentTopicId references
        await collection.updateMany({
            parentTopicId: new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["ObjectId"](topicId)
        }, {
            $unset: {
                parentTopicId: ""
            }
        });
        const result = await collection.deleteOne({
            _id: new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["ObjectId"](topicId)
        });
        if (result.deletedCount === 0) {
            return {
                success: false,
                error: "Topic not found"
            };
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/topics");
        return {
            success: true
        };
    } catch (error) {
        console.error("Error deleting topic:", error);
        return {
            success: false,
            error: "Failed to delete topic"
        };
    }
}
async function linkTopics(topicId, linkedTopicId) {
    try {
        const mongoClient = await __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$lib$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].connect();
        const db = mongoClient.db();
        const collection = db.collection("topics");
        if (topicId === linkedTopicId) {
            return {
                success: false,
                error: "A topic cannot be linked to itself"
            };
        }
        // Add bidirectional link
        await collection.updateOne({
            _id: new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["ObjectId"](topicId)
        }, {
            $addToSet: {
                linkedTopics: new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["ObjectId"](linkedTopicId)
            }
        });
        await collection.updateOne({
            _id: new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["ObjectId"](linkedTopicId)
        }, {
            $addToSet: {
                linkedTopics: new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["ObjectId"](topicId)
            }
        });
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/topics");
        return {
            success: true
        };
    } catch (error) {
        console.error("Error linking topics:", error);
        return {
            success: false,
            error: "Failed to link topics"
        };
    }
}
async function unlinkTopics(topicId, linkedTopicId) {
    try {
        const mongoClient = await __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$lib$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].connect();
        const db = mongoClient.db();
        const collection = db.collection("topics");
        // Remove bidirectional link
        await collection.updateOne({
            _id: new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["ObjectId"](topicId)
        }, {
            $pull: {
                linkedTopics: new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["ObjectId"](linkedTopicId)
            }
        });
        await collection.updateOne({
            _id: new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["ObjectId"](linkedTopicId)
        }, {
            $pull: {
                linkedTopics: new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$29$__["ObjectId"](topicId)
            }
        });
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/topics");
        return {
            success: true
        };
    } catch (error) {
        console.error("Error unlinking topics:", error);
        return {
            success: false,
            error: "Failed to unlink topics"
        };
    }
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    testDatabaseConnection,
    createTask,
    getTasks,
    updateTask,
    deleteTask,
    toggleTask,
    createTopic,
    getTopics,
    getTopic,
    updateTopic,
    deleteTopic,
    linkTopics,
    unlinkTopics
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(testDatabaseConnection, "00ce06ea6ea7e78d26705c7b11bbe248dd2eb43071", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(createTask, "408870d73fc9056cb4ab916de9bae5f56623b71d20", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getTasks, "00ac6ac639ff0576ee71cdb5403463dee6f270c51e", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(updateTask, "60f43b2bb0e7f444097c8215eb7efbb0f1459e8d4b", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(deleteTask, "409c5c2a29ed84fd664c3adb5e83fa69411a59caa1", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(toggleTask, "60f80b6b518878b27e897712c8401ce95f5475b56b", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(createTopic, "408fb1708826857324fb2c89c2cae6175c7e991c69", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getTopics, "00b5db871c0010172d8cf564be84fea8c1aea291f1", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getTopic, "40e0a8fb2ae6e652c233b71432bfe36271277bd0ec", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(updateTopic, "6033e7acf12dcc200aa73db9bed08078be585348e0", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(deleteTopic, "4092ab85bf917b0e95604d88937da44e86b96f49d8", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(linkTopics, "60ae7fc0b06e3f8d85596e7dd3dcfdb01a4a8af60a", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(unlinkTopics, "608d7fd3dca4c415421e58e681d8fe7d0b7f02917f", null);
}),
"[project]/denotesCRUD/.next-internal/server/app/topics/page/actions.js { ACTIONS_MODULE0 => \"[project]/denotesCRUD/app/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$app$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denotesCRUD/app/actions.ts [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
}),
"[project]/denotesCRUD/.next-internal/server/app/topics/page/actions.js { ACTIONS_MODULE0 => \"[project]/denotesCRUD/app/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "00b5db871c0010172d8cf564be84fea8c1aea291f1",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$app$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getTopics"],
    "408fb1708826857324fb2c89c2cae6175c7e991c69",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$app$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createTopic"],
    "4092ab85bf917b0e95604d88937da44e86b96f49d8",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$app$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["deleteTopic"],
    "40e0a8fb2ae6e652c233b71432bfe36271277bd0ec",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$app$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getTopic"],
    "6033e7acf12dcc200aa73db9bed08078be585348e0",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$app$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["updateTopic"],
    "608d7fd3dca4c415421e58e681d8fe7d0b7f02917f",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$app$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["unlinkTopics"],
    "60ae7fc0b06e3f8d85596e7dd3dcfdb01a4a8af60a",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$app$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["linkTopics"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f2e$next$2d$internal$2f$server$2f$app$2f$topics$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$denotesCRUD$2f$app$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/denotesCRUD/.next-internal/server/app/topics/page/actions.js { ACTIONS_MODULE0 => "[project]/denotesCRUD/app/actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$denotesCRUD$2f$app$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/denotesCRUD/app/actions.ts [app-rsc] (ecmascript)");
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__9095e4a0._.js.map