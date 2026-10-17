
import asyncio
from sqlalchemy import text
from backend.app.db.session import engine

async def main():
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE exceptions ALTER COLUMN resolved_by TYPE VARCHAR(128) USING resolved_by::text;"))
    print("Column altered successfully!")

if __name__ == "__main__":
    asyncio.run(main())
