from sentence_transformers import SentenceTransformer, util

model = SentenceTransformer('all-MiniLM-L6-v2')

memory = "Aarohan is a 4th semester BSCS undergrad doing a NestJS + NextJS internship for fullstack development, but doesn't know JavaScript that well. He's asking for a rough rundown since he's only worked with these frameworks for a few weeks and may have missed some things."

# Try to combine the user query with some keywords to boost retrieval
queries = [
    "who am i? user profile identity facts",
    "who am i? my name and background",
    "who am i? stored memory about user",
]

memory_embedding = model.encode(memory)

for q in queries:
    q_embedding = model.encode(q)
    sim = util.cos_sim(q_embedding, memory_embedding)
    print(f"Query: '{q}' -> Similarity: {sim.item():.4f}")
