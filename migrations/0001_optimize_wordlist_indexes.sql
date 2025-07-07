-- Migration: Optimize wordlist indexes for performance
-- This migration adds critical composite indexes to improve wordlist query performance

-- 1. Primary wordlist access pattern: (userId, lang) + word ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wordlist_user_lang_created 
ON "wordlist"("user_id", "created_at" DESC);

-- 2. Word lookup optimization with included columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wordlist_user_word 
ON "wordlist"("user_id", "word_id") INCLUDE ("created_at");

-- 3. Language-based wordlist access with word information
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_words_lang_word 
ON "words"("lang", "word") INCLUDE ("id", "frequency_rank");

-- 4. Definition access by word with included columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_definitions_word_pos 
ON "definitions"("word_id", "pos") INCLUDE ("sense", "examples");

-- 5. Translation lookup optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_translations_def_lang 
ON "translations"("definition_id", "target_lang") INCLUDE ("translated_sense");

-- 6. Composite index for the main JOIN pattern optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wordlist_join_optimization 
ON "wordlist"("user_id", "word_id") 
INCLUDE ("created_at");

-- 7. Additional index for wordlist summary queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wordlist_user_created 
ON "wordlist"("user_id", "created_at" DESC);

-- 8. Index for efficient word existence checks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_words_word_lang_unique 
ON "words"("word", "lang");

-- Add comments for documentation
COMMENT ON INDEX idx_wordlist_user_lang_created IS 'Optimizes wordlist queries by user and language with creation date ordering';
COMMENT ON INDEX idx_wordlist_user_word IS 'Optimizes word lookup operations with included creation date';
COMMENT ON INDEX idx_words_lang_word IS 'Optimizes word searches by language with included metadata';
COMMENT ON INDEX idx_definitions_word_pos IS 'Optimizes definition retrieval with included content';
COMMENT ON INDEX idx_translations_def_lang IS 'Optimizes translation lookups by definition and target language';
COMMENT ON INDEX idx_wordlist_join_optimization IS 'Optimizes main wordlist JOIN operations';
COMMENT ON INDEX idx_wordlist_user_created IS 'Optimizes user wordlist queries by creation date';
COMMENT ON INDEX idx_words_word_lang_unique IS 'Optimizes word existence checks and uniqueness constraints'; 