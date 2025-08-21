const Subcourse = require("../../../course/models/subcourse");
const {apiResponse} = require("../../../utils/apiResponse")

exports.getAllSubcourseNameAndAvgRating = async (req, res) => {
  try {
    // Fetch all subcourse names and average ratings
    const subcourses = await Subcourse.aggregate([
      {
        $project: {
          subcourseName: 1,
          avgRating: 1
        }
      }
    ]);

    if (!subcourses.length) {
      return apiResponse(res, {
        success: false,
        message: 'No subcourses found',
        statusCode: 404,
      });
    }

    // Add SNo to each subcourse
    const subcoursesWithSNo = subcourses.map((subcourse, index) => ({
      SNo: index + 1,
      subcourseName: subcourse.subcourseName,
      avgRating: subcourse.avgRating,
    }));

    return apiResponse(res, {
      success: true,
      message: 'Subcourses retrieved successfully',
      data: subcoursesWithSNo,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error fetching subcourses:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to fetch subcourses: ${error.message}`,
      statusCode: 500,
    });
  }
};