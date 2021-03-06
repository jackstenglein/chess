import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.Stroke;

public class Space {
	
	//instance variables
	private Piece piece;
	private int row;
	private int col;
	private boolean isSelected;
	private boolean isPossibleMove;
	private boolean isTakingMove;
	
	/**
	 * Creates a Space object with row and column set to the specified values 
	 * and no piece contained within it.
	 * 
	 * @param row The row of the space.
	 * 			  Board.MIN_ROW <= row <= Board.MAX_ROW
	 * @param col The column of the space.
	 * 			  Board.MIN_COL <= col <= Board.MAX_COL
	 */
	public Space(int row, int col) {
		this(row, col, null);
	}
	
	/**
	 * Creates a Space object with row, column and piece set to the specified values.
	 * 
	 * @param row The row of the space.
	 * 			  Board.MIN_ROW <= row <= Board.MAX_ROW
	 * @param col The column of the space.
	 * 			  Board.MIN_COL <= col <= Board.MAX_COL
	 * @param piece The piece this space holds.
	 */
	public Space(int row, int col, Piece piece) {
		if (row < Board.MIN_ROW || row > Board.MAX_ROW || col < Board.MIN_COL || col > Board.MAX_COL) {
			throw new IllegalArgumentException("Row/col are out of bounds. Row: " + row + ", col: " + col);
		}
		this.row = row;
		this.col = col;
		this.piece = piece;
	}
	
	/**
	 * Sets the space to selected or not selected.
	 * 
	 * @param selected A boolean indicating whether the space should
	 *                 be rendered as selected.
	 */
	public void setSelected(boolean selected) {
		isSelected = selected;
	}
	
	/**
	 * Sets the space to be displayed as a taking move or not.
	 * 
	 * @param isTakingMove A boolean indicating whether this space is a taking move.
	 */
	public void setTakingMove(boolean isTakingMove) {
		this.isTakingMove = isTakingMove;
	}
	
	/**
	 * Sets whether this space should be rendered as a possible move.
	 * 
	 * @param isPossibleMove A boolean indicating that this space is a possible move.
	 */
	public void setPossibleMove(boolean isPossibleMove) {
		this.isPossibleMove = isPossibleMove;
	}
	
	/**
	 * Returns whether this space is a possible move.
	 * 
	 * @return A boolean indicating whether this space is a possible move.
	 */
	public boolean isPossibleMove() {
		return isPossibleMove;
	}
	
	/**
	 * Sets the piece that this space is holding.
	 * 
	 * @param piece The piece to place in this space.
	 */
	public void setPiece(Piece piece) {
		this.piece = piece;
	}
	
	/**
	 * Returns the piece that this space is holding.
	 * 
	 * @return The piece contained in this space, or null
	 *         if none exists.
	 */
	public Piece getPiece() {
		return piece;
	}
	
	/**
	 * Returns true if this space is empty and false otherwise.
	 * 
	 * @return True if this space is empty.
	 */
	public boolean isEmpty() {
		return (piece == null);
	}
	
	/**
	 * Return the row of this space.
	 * @return The row
	 */
	public int getRow() {
		return row;
	}
	
	/**
	 * Return the column of this space.
	 * @return The column
	 */
	public int getCol() {
		return col;
	}
	
	/**
	 * Returns the row, column and piece concatenated in a string.
	 * 
	 * @return A string representation of this space.
	 */
	public String toString() {
		String result = "Row: " + row + ", Col: " + col + "Piece " + piece;
		return result;
	}
	
	@Override
	public int hashCode() {
		final int prime = 31;
		int result = 1;
		result = prime * result + col;
		result = prime * result + row;
		return result;
	}

	/**
	 * Returns true if other is a Space object with the same row and
	 * column as this object.
	 * 
	 * @param other The object to compare to this Space.
	 * @return True if the objects are equal. False otherwise.
	 */
	public boolean equals(Object other) {
		if(other instanceof Space) {
			Space otherSpace = (Space)other;
			if(row == otherSpace.row && col == otherSpace.col)
				return true;
		}
		return false;
	}
	
	/**
	 * Paints this space using the given graphics object. The space
	 * is painted with a green outline if it is selected, a red outline
	 * if it is a taking move and a blue outline if it is a possible move.
	 * 
	 * @param graphic The graphics context in which to paint the space.
	 */
	public void paint(Graphics graphic) {
		Graphics2D g2 = (Graphics2D) graphic;
		float thickness = 2;
		Stroke oldStroke = g2.getStroke();
		g2.setStroke(new BasicStroke(thickness));

		if (isSelected) {
			graphic.setColor(Color.GREEN);
			graphic.drawRect(col * Game.SPACE_SIDE_LENGTH,
					row * Game.SPACE_SIDE_LENGTH + GraphicsController.HUD_BAR_HEIGHT, Game.SPACE_SIDE_LENGTH,
					Game.SPACE_SIDE_LENGTH);
		} else if (isTakingMove) {
			graphic.setColor(Color.RED);
			graphic.drawRect(col * Game.SPACE_SIDE_LENGTH,
					row * Game.SPACE_SIDE_LENGTH + GraphicsController.HUD_BAR_HEIGHT, Game.SPACE_SIDE_LENGTH,
					Game.SPACE_SIDE_LENGTH);
		} else if (isPossibleMove) {
			graphic.setColor(Color.BLUE);
			graphic.drawRect(col * Game.SPACE_SIDE_LENGTH,
					row * Game.SPACE_SIDE_LENGTH + GraphicsController.HUD_BAR_HEIGHT, Game.SPACE_SIDE_LENGTH,
					Game.SPACE_SIDE_LENGTH);
		}

		g2.setStroke(oldStroke);
	}
}
